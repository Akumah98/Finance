const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const { analyzeSpending } = require('../utils/spendingAnalysis');

// Get insights for a user
router.get('/:userId', async (req, res) => {
    try {
        // Fetch user's transactions
        const transactions = await Transaction.find({ userId: req.params.userId }).sort({ date: -1 });

        // Fetch user's budgets
        const budgetDocs = await Budget.find({ userId: req.params.userId });

        // Convert to object format { category: amount }
        const budgets = {};
        budgetDocs.forEach(b => {
            budgets[b.category] = b.amount;
        });

        // Analyze spending and generate insights
        const insights = analyzeSpending(transactions, budgets);

        res.json(insights);
    } catch (err) {
        console.error('Error generating insights:', err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
