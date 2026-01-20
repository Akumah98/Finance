const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const { protect } = require('../middleware/authMiddleware');

// Apply protection to all routes
router.use(protect);

// Get all transactions for a user
router.get('/', async (req, res) => {
    try {
        const transactions = await Transaction.find({ userId: req.user.id }).sort({ date: -1 });
        res.json(transactions);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Add a new transaction
router.post('/', async (req, res) => {
    const { type, amount, category, date, note, receiptUri } = req.body;

    try {
        const newTransaction = new Transaction({
            userId: req.user.id,
            type,
            amount,
            category,
            date,
            note,
            receiptUri
        });

        const savedTransaction = await newTransaction.save();
        res.status(201).json(savedTransaction);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update a transaction
router.put('/:id', async (req, res) => {
    try {
        console.log('UPDATE transaction called:', { id: req.params.id, body: req.body });

        const transaction = await Transaction.findById(req.params.id);

        if (!transaction) {
            console.log('Transaction not found:', req.params.id);
            return res.status(404).json({ message: 'Transaction not found' });
        }

        // Make sure user owns the transaction
        if (transaction.userId.toString() !== req.user.id) {
            return res.status(401).json({ message: 'User not authorized' });
        }

        const updatedTransaction = await Transaction.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        console.log('Transaction updated successfully:', updatedTransaction._id);
        res.json(updatedTransaction);
    } catch (err) {
        console.error('UPDATE transaction error:', err.message);
        res.status(400).json({ message: err.message });
    }
});

// Delete a transaction
router.delete('/:id', async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id);

        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        // Make sure user owns the transaction
        if (transaction.userId.toString() !== req.user.id) {
            return res.status(401).json({ message: 'User not authorized' });
        }

        await Transaction.findByIdAndDelete(req.params.id);
        res.json({ message: 'Transaction deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Add multiple transactions (Bulk)
router.post('/bulk', async (req, res) => {
    const transactions = req.body;

    if (!Array.isArray(transactions) || transactions.length === 0) {
        return res.status(400).json({ message: 'No transactions provided' });
    }

    try {
        // Ensure security by forcing userId from token
        const transactionsToSave = transactions.map(t => ({
            ...t,
            userId: req.user.id,
            // Ensure essential fields are present if not handled by schema defaults (though schema handles most)
            date: t.date || new Date(),
            type: t.type || 'expense',
            amount: t.amount,
            category: t.category || 'Other',
            note: t.note,
            receiptUri: t.receiptUri
        }));

        const savedTransactions = await Transaction.insertMany(transactionsToSave);
        res.status(201).json(savedTransactions);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;
