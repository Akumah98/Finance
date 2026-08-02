const express = require('express');
const router = express.Router();
const SavingsGoal = require('../models/SavingsGoal');
const Transaction = require('../models/Transaction');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

// Get all goals for the authenticated user
router.get('/', async (req, res) => {
    try {
        const goals = await SavingsGoal.find({ userId: req.user._id }).sort({ deadline: 1 });
        res.json(goals);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create a new goal
router.post('/', async (req, res) => {
    const { name, targetAmount, currentAmount, deadline, icon, color } = req.body;

    try {
        const newGoal = new SavingsGoal({
            userId: req.user._id,
            name,
            targetAmount,
            currentAmount,
            deadline,
            icon,
            color
        });

        const savedGoal = await newGoal.save();
        res.status(201).json(savedGoal);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Add funds to a goal
router.patch('/:id/add-funds', async (req, res) => {
    const { amount } = req.body;
    try {
        const goal = await SavingsGoal.findById(req.params.id);
        if (!goal) return res.status(404).json({ message: 'Goal not found' });

        goal.currentAmount += parseFloat(amount);
        await goal.save();

        // Create a transaction for this savings contribution
        await new Transaction({
            userId: goal.userId,
            type: 'expense',
            amount: parseFloat(amount),
            category: 'Savings',
            date: new Date(),
            note: `Added to ${goal.name}`
        }).save();

        res.json(goal);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update a goal (e.g. adding invalid funds, editing details)
router.put('/:id', async (req, res) => {
    try {
        const updatedGoal = await SavingsGoal.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        res.json(updatedGoal);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete a goal
router.delete('/:id', async (req, res) => {
    try {
        await SavingsGoal.findByIdAndDelete(req.params.id);
        res.json({ message: 'Goal deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/savings-goals/autopilot — calculate daily/weekly targets for all goals
router.get('/autopilot', async (req, res) => {
    try {
        const goals = await SavingsGoal.find({ userId: req.user._id }).lean();
        const now = new Date();

        const autopilot = goals
            .filter(g => g.deadline && g.currentAmount < g.targetAmount)
            .map(g => {
                const remaining = g.targetAmount - g.currentAmount;
                const daysLeft = Math.max(1, Math.ceil((new Date(g.deadline) - now) / (1000 * 60 * 60 * 24)));
                const weeksLeft = Math.max(1, Math.ceil(daysLeft / 7));
                const dailyTarget = Math.ceil(remaining / daysLeft);
                const weeklyTarget = Math.ceil(remaining / weeksLeft);
                const progress = Math.round((g.currentAmount / g.targetAmount) * 100);
                const onTrack = dailyTarget <= (g.targetAmount / 90); // reasonable if daily is ≤ total/90 days

                return {
                    _id: g._id,
                    name: g.name,
                    targetAmount: g.targetAmount,
                    currentAmount: g.currentAmount,
                    remaining,
                    deadline: g.deadline,
                    daysLeft,
                    dailyTarget,
                    weeklyTarget,
                    progress,
                    onTrack,
                    icon: g.icon,
                    color: g.color
                };
            })
            .sort((a, b) => a.daysLeft - b.daysLeft);

        res.json(autopilot);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
