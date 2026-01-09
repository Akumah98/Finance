const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Transaction = require('../models/Transaction');
const Bill = require('../models/Bill');

// Get message history
router.get('/:userId', async (req, res) => {
    try {
        const messages = await Message.find({ userId: req.params.userId }).sort({ createdAt: 1 });
        res.json(messages);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Send a message
router.post('/', async (req, res) => {
    const { userId, text } = req.body;

    try {
        // 1. Save User Message
        const userMessage = new Message({ userId, text, role: 'user' });
        await userMessage.save();

        // 2. AI Logic (Simple keyword matching for now)
        let responseText = "I'm listening. Ask me about your spending or bills.";
        const lowerText = text.toLowerCase();

        if (lowerText.includes('spent') || lowerText.includes('spending')) {
            const transactions = await Transaction.find({ userId });
            const total = transactions.reduce((sum, t) => sum + t.amount, 0);
            responseText = `You have spent a total of $${total.toFixed(2)} so far.`;
        } else if (lowerText.includes('bill')) {
            const bills = await Bill.find({ userId, isPaid: false });
            if (bills.length === 0) {
                responseText = "You have no upcoming unpaid bills.";
            } else {
                const billNames = bills.map(b => b.name).join(', ');
                responseText = `You have ${bills.length} upcoming bills: ${billNames}.`;
            }
        }

        // 3. Save AI Response
        const aiMessage = new Message({ userId, text: responseText, role: 'assistant' });
        await aiMessage.save();

        // Return the AI response (frontend will append user message locally or re-fetch)
        res.json(aiMessage);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;
