const express = require('express');
const router = express.Router();
const Category = require('../models/Category');

// Middleware to verify token (we'll implement a proper middleware later, 
// for now we'll assume the frontend sends the userId or we extract it from token if we add auth middleware)
// Ideally, we should use the auth middleware here.

// Get all categories for a user (Auto-seed defaults if empty)
router.get('/:userId', async (req, res) => {
    try {
        let categories = await Category.find({ userId: req.params.userId });

        if (categories.length === 0) {
            const defaultCategories = [
                { name: 'Food', icon: 'food', type: 'expense', color: '#EF4444' },
                { name: 'Transport', icon: 'bus', type: 'expense', color: '#F59E0B' },
                { name: 'Shopping', icon: 'shopping', type: 'expense', color: '#EC4899' },
                { name: 'Health', icon: 'medical-bag', type: 'expense', color: '#10B981' },
                { name: 'Bills', icon: 'file-document', type: 'expense', color: '#6366F1' },
                { name: 'Entertainment', icon: 'movie', type: 'expense', color: '#8B5CF6' },
                { name: 'Education', icon: 'school', type: 'expense', color: '#3B82F6' },
                { name: 'Other', icon: 'dots-horizontal', type: 'expense', color: '#6B7280' },
                { name: 'Salary', icon: 'cash', type: 'income', color: '#10B981' },
                { name: 'Freelance', icon: 'laptop', type: 'income', color: '#3B82F6' },
                { name: 'Gift', icon: 'gift', type: 'income', color: '#EC4899' },
                { name: 'Other', icon: 'dots-horizontal', type: 'income', color: '#6B7280' }
            ];

            const categoriesToInsert = defaultCategories.map(cat => ({ ...cat, userId: req.params.userId }));
            categories = await Category.insertMany(categoriesToInsert);
        }

        res.json(categories);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create a new category
router.post('/', async (req, res) => {
    const { userId, name, icon, color, type } = req.body;

    try {
        const newCategory = new Category({
            userId,
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
