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

module.exports = router;
