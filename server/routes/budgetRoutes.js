const express = require('express');
const router = express.Router();
const Budget = require('../models/Budget');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

// Get all budgets for the authenticated user
router.get('/', async (req, res) => {
    try {
        const budgets = await Budget.find({ userId: req.user._id });
        res.json(budgets);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create or update a budget
router.post('/', async (req, res) => {
    const { category, amount, period } = req.body;
    const userId = req.user._id;

    try {
        // Check if budget already exists for this category
        const existingBudget = await Budget.findOne({ userId, category });

        if (existingBudget) {
            // Update existing budget
            existingBudget.amount = amount;
            existingBudget.period = period || 'monthly';
            existingBudget.updatedAt = new Date();
            const updatedBudget = await existingBudget.save();
            return res.json(updatedBudget);
        }

        // Create new budget
        const newBudget = new Budget({
            userId,
            category,
            amount,
            period: period || 'monthly'
        });

        const savedBudget = await newBudget.save();
        res.status(201).json(savedBudget);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update a budget
router.put('/:id', async (req, res) => {
    try {
        const { amount, period } = req.body;
        const updatedBudget = await Budget.findByIdAndUpdate(
            req.params.id,
            { amount, period, updatedAt: new Date() },
            { new: true }
        );

        if (!updatedBudget) {
            return res.status(404).json({ message: 'Budget not found' });
        }

        res.json(updatedBudget);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete a budget
router.delete('/:id', async (req, res) => {
    try {
        const deletedBudget = await Budget.findByIdAndDelete(req.params.id);

        if (!deletedBudget) {
            return res.status(404).json({ message: 'Budget not found' });
        }

        res.json({ message: 'Budget deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
