const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

// GET /api/export/transactions — export as CSV
router.get('/transactions', async (req, res) => {
    try {
        const filter = { userId: req.user.id };

        if (req.query.startDate || req.query.endDate) {
            filter.date = {};
            if (req.query.startDate) filter.date.$gte = new Date(req.query.startDate);
            if (req.query.endDate) filter.date.$lte = new Date(req.query.endDate);
        }

        if (req.query.type) {
            filter.type = req.query.type;
        }

        const transactions = await Transaction.find(filter)
            .sort({ date: -1 })
            .select('-embedding -__v')
            .lean();

        if (transactions.length === 0) {
            return res.status(404).json({ message: 'No transactions found for the selected period' });
        }

        // Build CSV
        const headers = ['Date', 'Type', 'Category', 'Amount', 'Note'];
        const rows = transactions.map(t => [
            new Date(t.date).toISOString().split('T')[0],
            t.type,
            `"${(t.category || '').replace(/"/g, '""')}"`,
            t.amount,
            `"${(t.note || '').replace(/"/g, '""')}"`
        ].join(','));

        const csv = [headers.join(','), ...rows].join('\n');

        const filename = `glitch-transactions-${new Date().toISOString().split('T')[0]}.csv`;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csv);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/export/summary — monthly summary as CSV
router.get('/summary', async (req, res) => {
    try {
        const transactions = await Transaction.find({ userId: req.user.id })
            .sort({ date: -1 })
            .select('type amount category date')
            .lean();

        if (transactions.length === 0) {
            return res.status(404).json({ message: 'No transactions found' });
        }

        // Group by month
        const monthlyData = {};
        for (const t of transactions) {
            const d = new Date(t.date);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (!monthlyData[key]) {
                monthlyData[key] = { income: 0, expenses: 0, categories: {} };
            }
            if (t.type === 'income') {
                monthlyData[key].income += t.amount;
            } else {
                monthlyData[key].expenses += t.amount;
                monthlyData[key].categories[t.category] = (monthlyData[key].categories[t.category] || 0) + t.amount;
            }
        }

        const headers = ['Month', 'Income', 'Expenses', 'Net', 'Top Category', 'Top Category Amount'];
        const rows = Object.entries(monthlyData)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([month, data]) => {
                const topCat = Object.entries(data.categories).sort(([, a], [, b]) => b - a)[0];
                return [
                    month,
                    data.income.toFixed(2),
                    data.expenses.toFixed(2),
                    (data.income - data.expenses).toFixed(2),
                    topCat ? `"${topCat[0]}"` : '',
                    topCat ? topCat[1].toFixed(2) : '0'
                ].join(',');
            });

        const csv = [headers.join(','), ...rows].join('\n');
        const filename = `glitch-summary-${new Date().toISOString().split('T')[0]}.csv`;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csv);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
