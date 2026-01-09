const express = require('express');
const router = express.Router();
const Bill = require('../models/Bill');

const BillHistory = require('../models/BillHistory');

// Get all bills for a user
router.get('/:userId', async (req, res) => {
    try {
        const bills = await Bill.find({ userId: req.params.userId }).sort({ dueDate: 1 });
        res.json(bills);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get bill history for a user
router.get('/history/:userId', async (req, res) => {
    try {
        const history = await BillHistory.find({ userId: req.params.userId }).sort({ timestamp: -1 });
        res.json(history);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create a new bill
router.post('/', async (req, res) => {
    const { userId, name, amount, dueDate, frequency, category, autoPay, companyLogo } = req.body;

    try {
        const newBill = new Bill({
            userId,
            name,
            amount,
            dueDate,
            frequency,
            category,
            autoPay,
            companyLogo
        });

        const savedBill = await newBill.save();

        // Log history
        await new BillHistory({
            userId,
            billName: name,
            changeType: 'CREATED',
            details: `Bill created: $${amount} (${frequency})`,
            amount: amount,
            billCreatedAt: savedBill.createdAt
        }).save();

        res.status(201).json(savedBill);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update a bill
router.put('/:id', async (req, res) => {
    try {
        const { reason, ...updateData } = req.body;
        const originalBill = await Bill.findById(req.params.id);
        if (!originalBill) return res.status(404).json({ message: 'Bill not found' });

        const updatedBill = await Bill.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        // Detect changes
        let changes = [];
        if (originalBill.amount !== updatedBill.amount) changes.push(`Amount: $${originalBill.amount} -> $${updatedBill.amount}`);
        if (originalBill.frequency !== updatedBill.frequency) changes.push(`Frequency: ${originalBill.frequency} -> ${updatedBill.frequency}`);
        if (new Date(originalBill.dueDate).toDateString() !== new Date(updatedBill.dueDate).toDateString()) changes.push(`Date changed`);
        if (originalBill.name !== updatedBill.name) changes.push(`Name: ${originalBill.name} -> ${updatedBill.name}`);
        if (originalBill.category !== updatedBill.category) changes.push(`Category: ${originalBill.category} -> ${updatedBill.category}`);

        if (changes.length > 0) {
            await new BillHistory({
                userId: originalBill.userId,
                billName: updatedBill.name,
                changeType: 'UPDATED',
                details: changes.join(', '),
                reason: reason || '',
                amount: updatedBill.amount,
                billCreatedAt: originalBill.createdAt
            }).save();
        }

        res.json(updatedBill);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete a bill
router.delete('/:id', async (req, res) => {
    try {
        const { reason } = req.body;
        const bill = await Bill.findById(req.params.id);
        if (bill) {
            await Bill.findByIdAndDelete(req.params.id);

            // Log history
            await new BillHistory({
                userId: bill.userId,
                billName: bill.name,
                changeType: 'DELETED',
                details: `Bill deleted`,
                amount: bill.amount,
                billCreatedAt: bill.createdAt,
                reason: reason || ''
            }).save();
        }
        res.json({ message: 'Bill deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Mark as paid/unpaid
router.patch('/:id/pay', async (req, res) => {
    const { isPaid, deleteTransaction } = req.body;
    try {
        const bill = await Bill.findById(req.params.id);
        if (!bill) return res.status(404).json({ message: 'Bill not found' });

        let transactionId = bill.linkedTransactionId;

        if (isPaid && !bill.isPaid) {
            // Marking as paid - create transaction
            const Transaction = require('../models/Transaction');
            const newTransaction = new Transaction({
                userId: bill.userId,
                type: 'expense',
                amount: bill.amount,
                category: bill.category,
                date: new Date(),
                note: `Payment for ${bill.name}`
            });
            const savedTransaction = await newTransaction.save();
            transactionId = savedTransaction._id;

            const updatedBill = await Bill.findByIdAndUpdate(
                req.params.id,
                { isPaid: true, linkedTransactionId: transactionId },
                { new: true }
            );

            await new BillHistory({
                userId: bill.userId,
                billName: bill.name,
                changeType: 'PAID',
                details: 'Marked as paid (transaction created)',
                amount: bill.amount,
                billCreatedAt: bill.createdAt
            }).save();

            res.json(updatedBill);

        } else if (!isPaid && bill.isPaid) {
            // Marking as unpaid - optionally delete transaction
            if (deleteTransaction && bill.linkedTransactionId) {
                const Transaction = require('../models/Transaction');
                await Transaction.findByIdAndDelete(bill.linkedTransactionId);
            }

            const updatedBill = await Bill.findByIdAndUpdate(
                req.params.id,
                { isPaid: false, linkedTransactionId: null },
                { new: true }
            );

            await new BillHistory({
                userId: bill.userId,
                billName: bill.name,
                changeType: 'UPDATED',
                details: deleteTransaction ? 'Marked as unpaid (transaction deleted)' : 'Marked as unpaid',
                amount: bill.amount,
                billCreatedAt: bill.createdAt
            }).save();

            res.json(updatedBill);
        } else {
            res.json(bill);
        }

    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;
