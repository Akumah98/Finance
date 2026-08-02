const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const Bill = require('../models/Bill');
const SavingsGoal = require('../models/SavingsGoal');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

// GET /api/calendar?month=2026-08 — get all financial events for a month
router.get('/', async (req, res) => {
    try {
        const { month } = req.query; // format: YYYY-MM
        const now = new Date();
        let year, mon;

        if (month) {
            [year, mon] = month.split('-').map(Number);
        } else {
            year = now.getFullYear();
            mon = now.getMonth() + 1;
        }

        const startOfMonth = new Date(year, mon - 1, 1);
        const endOfMonth = new Date(year, mon, 0, 23, 59, 59, 999);

        const [transactions, bills, goals] = await Promise.all([
            Transaction.find({
                userId: req.user.id,
                date: { $gte: startOfMonth, $lte: endOfMonth }
            }).select('type amount category note date').sort({ date: 1 }).lean(),

            Bill.find({
                userId: req.user.id,
                dueDate: { $gte: startOfMonth, $lte: endOfMonth }
            }).select('name amount dueDate isPaid').lean(),

            SavingsGoal.find({
                userId: req.user._id,
                deadline: { $gte: startOfMonth, $lte: endOfMonth }
            }).select('name targetAmount currentAmount deadline icon color').lean()
        ]);

        // Build events array
        const events = [];

        for (const tx of transactions) {
            events.push({
                type: 'transaction',
                subtype: tx.type,
                date: tx.date,
                title: tx.note || tx.category,
                amount: tx.amount,
                category: tx.category
            });
        }

        for (const bill of bills) {
            events.push({
                type: 'bill',
                date: bill.dueDate,
                title: bill.name,
                amount: bill.amount,
                isPaid: bill.isPaid
            });
        }

        for (const goal of goals) {
            events.push({
                type: 'goal_deadline',
                date: goal.deadline,
                title: goal.name,
                amount: goal.targetAmount,
                currentAmount: goal.currentAmount,
                icon: goal.icon,
                color: goal.color
            });
        }

        // Group by day
        const byDay = {};
        for (const event of events) {
            const day = new Date(event.date).getDate();
            if (!byDay[day]) byDay[day] = [];
            byDay[day].push(event);
        }

        // Daily summary
        const dailySummary = {};
        for (const [day, dayEvents] of Object.entries(byDay)) {
            const income = dayEvents.filter(e => e.type === 'transaction' && e.subtype === 'income').reduce((s, e) => s + e.amount, 0);
            const expenses = dayEvents.filter(e => e.type === 'transaction' && e.subtype === 'expense').reduce((s, e) => s + e.amount, 0);
            const billsDue = dayEvents.filter(e => e.type === 'bill').length;
            const goalsDue = dayEvents.filter(e => e.type === 'goal_deadline').length;
            dailySummary[day] = { income, expenses, billsDue, goalsDue, eventCount: dayEvents.length };
        }

        res.json({ events: byDay, summary: dailySummary, month: `${year}-${String(mon).padStart(2, '0')}` });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
