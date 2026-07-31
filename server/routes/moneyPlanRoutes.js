const express = require('express');
const router = express.Router();
const MoneyPlan = require('../models/MoneyPlan');
const Transaction = require('../models/Transaction');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

// GET /api/money-plan
// Returns the user's plan config + live bucket calculations for the current month
router.get('/', async (req, res) => {
    try {
        const userId = req.user._id;

        // Get or create the plan with defaults
        let plan = await MoneyPlan.findOne({ userId });
        if (!plan) {
            plan = await MoneyPlan.create({ userId });
        }

        // Current month boundaries
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        const transactions = await Transaction.find({
            userId,
            date: { $gte: startOfMonth, $lte: endOfMonth }
        });

        const totalIncome = transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

        // Allocated amounts based on real income
        const needsAllocated = (plan.needsPct / 100) * totalIncome;
        const wantsAllocated = (plan.wantsPct / 100) * totalIncome;
        const futureAllocated = (plan.futurePct / 100) * totalIncome;

        // Actual spending per bucket
        const expenses = transactions.filter(t => t.type === 'expense');

        const needsSpent = expenses
            .filter(t => plan.needsCategories.includes(t.category))
            .reduce((sum, t) => sum + t.amount, 0);

        const wantsSpent = expenses
            .filter(t => plan.wantsCategories.includes(t.category))
            .reduce((sum, t) => sum + t.amount, 0);

        // Future = everything not explicitly in needs or wants
        const futureSpent = expenses
            .filter(t => !plan.needsCategories.includes(t.category) && !plan.wantsCategories.includes(t.category))
            .reduce((sum, t) => sum + t.amount, 0);

        res.json({
            plan: {
                needsPct: plan.needsPct,
                wantsPct: plan.wantsPct,
                futurePct: plan.futurePct,
                needsCategories: plan.needsCategories,
                wantsCategories: plan.wantsCategories,
            },
            month: {
                totalIncome,
                buckets: {
                    needs: {
                        allocated: needsAllocated,
                        spent: needsSpent,
                        left: needsAllocated - needsSpent,
                        overspent: needsSpent > needsAllocated
                    },
                    wants: {
                        allocated: wantsAllocated,
                        spent: wantsSpent,
                        left: wantsAllocated - wantsSpent,
                        overspent: wantsSpent > wantsAllocated
                    },
                    future: {
                        allocated: futureAllocated,
                        spent: futureSpent,
                        left: futureAllocated - futureSpent,
                        overspent: futureSpent > futureAllocated
                    }
                }
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PUT /api/money-plan
// Update percentages and/or category assignments
router.put('/', async (req, res) => {
    try {
        const userId = req.user._id;
        const { needsPct, wantsPct, futurePct, needsCategories, wantsCategories } = req.body;

        // Validate percentages sum to 100 if all three are provided
        if (needsPct !== undefined && wantsPct !== undefined && futurePct !== undefined) {
            const total = needsPct + wantsPct + futurePct;
            if (Math.round(total) !== 100) {
                return res.status(400).json({ message: `Percentages must sum to 100 (got ${total})` });
            }
        }

        const update = { updatedAt: new Date() };
        if (needsPct !== undefined) update.needsPct = needsPct;
        if (wantsPct !== undefined) update.wantsPct = wantsPct;
        if (futurePct !== undefined) update.futurePct = futurePct;
        if (needsCategories !== undefined) update.needsCategories = needsCategories;
        if (wantsCategories !== undefined) update.wantsCategories = wantsCategories;

        const plan = await MoneyPlan.findOneAndUpdate(
            { userId },
            { $set: update },
            { new: true, upsert: true }
        );

        res.json(plan);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;
