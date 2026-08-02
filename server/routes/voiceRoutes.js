const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { generateWithFallback } = require('../services/aiProvider');

router.use(protect);

// POST /api/voice/parse — parse a voice transcription into transaction fields
router.post('/parse', async (req, res) => {
    const { transcript } = req.body;

    if (!transcript || !transcript.trim()) {
        return res.status(400).json({ message: 'transcript is required' });
    }

    try {
        const prompt = `You are a transaction parser for a finance app. Parse the following spoken text into a structured transaction.

TEXT: "${transcript}"

Extract:
- type: "expense" or "income"
- amount: number (in FCFA if no currency mentioned)
- category: best guess from common categories (Food, Transport, Shopping, Health, Bills, Entertainment, Education, Salary, Freelance, Gift, Savings, Other)
- note: a cleaned-up short description of what the transaction is about
- date: if mentioned (like "yesterday", "last monday"), convert to ISO date string. If not mentioned, use null.

Respond ONLY with JSON, no markdown:
{"type":"expense","amount":2000,"category":"Food","note":"Lunch at campus cafeteria","date":null}`;

        const { text: responseText } = await generateWithFallback(prompt);

        let parsed;
        let cleaned = responseText.trim();
        if (cleaned.startsWith('```')) {
            cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        }

        try {
            parsed = JSON.parse(cleaned);
        } catch {
            const match = cleaned.match(/\{[\s\S]*\}/);
            if (match) {
                parsed = JSON.parse(match[0]);
            } else {
                return res.status(422).json({ message: 'Could not parse voice input. Try again with clearer phrasing.' });
            }
        }

        if (!parsed.amount || !parsed.type) {
            return res.status(422).json({ message: 'Could not determine amount or type from your input.' });
        }

        res.json({
            type: parsed.type === 'income' ? 'income' : 'expense',
            amount: Math.abs(Number(parsed.amount)),
            category: parsed.category || 'Other',
            note: parsed.note || transcript,
            date: parsed.date || null
        });
    } catch (err) {
        console.error('Voice parse error:', err.message);
        res.status(500).json({ message: 'Failed to parse voice input' });
    }
});

module.exports = router;
