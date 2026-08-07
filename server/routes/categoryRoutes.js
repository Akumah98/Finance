const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

// Get all categories for the authenticated user (Auto-seed defaults if empty)
router.get('/', async (req, res) => {
    try {
        let categories = await Category.find({ userId: req.user._id });

        const defaultCategories = [
            { name: 'Savings', icon: 'piggy-bank', type: 'expense', color: '#10B981' },
            { name: 'Food', icon: 'food', type: 'expense', color: '#EF4444' },
            { name: 'Transport', icon: 'bus', type: 'expense', color: '#F59E0B' },
            { name: 'Shopping', icon: 'shopping', type: 'expense', color: '#EC4899' },
            { name: 'Health', icon: 'medical-bag', type: 'expense', color: '#10B981' },
            { name: 'Bills', icon: 'file-document', type: 'expense', color: '#6366F1' },
            { name: 'Entertainment', icon: 'movie', type: 'expense', color: '#8B5CF6' },
            { name: 'Education', icon: 'school', type: 'expense', color: '#3B82F6' },
            { name: 'Other', icon: 'dots-horizontal', type: 'expense', color: '#6B7280' },
            { name: 'Savings', icon: 'piggy-bank', type: 'income', color: '#3B82F6' },
            { name: 'Salary', icon: 'cash', type: 'income', color: '#10B981' },
            { name: 'Freelance', icon: 'laptop', type: 'income', color: '#3B82F6' },
            { name: 'Gift', icon: 'gift', type: 'income', color: '#EC4899' },
            { name: 'Other', icon: 'dots-horizontal', type: 'income', color: '#6B7280' }
        ];

        if (categories.length === 0) {
            const categoriesToInsert = defaultCategories.map(cat => ({ ...cat, userId: req.user._id }));
            categories = await Category.insertMany(categoriesToInsert);
        } else {
            // Auto-seed missing Savings category for existing users if absent
            const hasExpenseSavings = categories.some(c => c.name === 'Savings' && c.type === 'expense');
            const hasIncomeSavings = categories.some(c => c.name === 'Savings' && c.type === 'income');
            const missingToInsert = [];
            if (!hasExpenseSavings) {
                missingToInsert.push({ name: 'Savings', icon: 'piggy-bank', type: 'expense', color: '#10B981', userId: req.user._id });
            }
            if (!hasIncomeSavings) {
                missingToInsert.push({ name: 'Savings', icon: 'piggy-bank', type: 'income', color: '#3B82F6', userId: req.user._id });
            }
            if (missingToInsert.length > 0) {
                const inserted = await Category.insertMany(missingToInsert);
                categories = [...categories, ...inserted];
            }
        }

        res.json(categories);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create a new category
router.post('/', async (req, res) => {
    const { name, icon, color, type } = req.body;

    try {
        const newCategory = new Category({
            userId: req.user._id,
            name,
            icon,
            color,
            type
        });

        const savedCategory = await newCategory.save();
        res.status(201).json(savedCategory);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete a category
router.delete('/:id', async (req, res) => {
    try {
        await Category.findByIdAndDelete(req.params.id);
        res.json({ message: 'Category deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
