const express = require('express');
const router = express.Router();
const Challenge = require('../models/Challenge');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

const AVAILABLE_CHALLENGES = [
    { type: 'no_spend', name: 'No-Spend Weekend', description: 'Don\'t spend anything on Saturday & Sunday', targetDays: 2 },
    { type: 'no_spend', name: 'No-Spend Week', description: 'Go 7 days without non-essential spending', targetDays: 7 },
    { type: 'daily_log', name: 'Log Streak', description: 'Log at least one transaction every day', targetDays: 30 },
    { type: 'daily_log', name: '7-Day Logger', description: 'Log transactions for 7 consecutive days', targetDays: 7 },
    { type: 'under_budget', name: 'Budget Master', description: 'Stay under ALL budgets for a full month', targetDays: 30 },
    { type: 'under_budget', name: 'Budget Week', description: 'Stay under all budgets for 7 days', targetDays: 7 },
    { type: 'savings_streak', name: 'Save Daily', description: 'Add to a savings goal every day for 14 days', targetDays: 14 },
    { type: 'savings_streak', name: 'Save Weekly', description: 'Add to savings at least once per week for 4 weeks', targetDays: 28 },
];

// GET /api/challenges — get user's active and completed challenges
router.get('/', async (req, res) => {
    try {
        const challenges = await Challenge.find({ userId: req.user._id }).sort({ isActive: -1, createdAt: -1 });
        res.json(challenges);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/challenges/available — get challenges user can start
router.get('/available', async (req, res) => {
    try {
        const active = await Challenge.find({ userId: req.user._id, isActive: true }).lean();
        const activeTypes = active.map(c => `${c.type}-${c.targetDays}`);
        const available = AVAILABLE_CHALLENGES.filter(c => !activeTypes.includes(`${c.type}-${c.targetDays}`));
        res.json(available);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /api/challenges — start a new challenge
router.post('/', async (req, res) => {
    const { type, name, description, targetDays, category } = req.body;

    try {
        const challenge = new Challenge({
            userId: req.user._id,
            type,
            name,
            description,
            targetDays,
            category,
            lastCheckDate: new Date()
        });

        const saved = await challenge.save();
        res.status(201).json(saved);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// POST /api/challenges/:id/check-in — update streak for a challenge
router.post('/:id/check-in', async (req, res) => {
    try {
        const challenge = await Challenge.findById(req.params.id);
        if (!challenge) return res.status(404).json({ message: 'Challenge not found' });
        if (challenge.userId.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const lastCheck = challenge.lastCheckDate ? new Date(challenge.lastCheckDate) : null;
        if (lastCheck) lastCheck.setHours(0, 0, 0, 0);

        // Prevent double check-in same day
        if (lastCheck && lastCheck.getTime() === today.getTime()) {
            return res.json(challenge);
        }

        // Verify the challenge condition is met
        const passed = await verifyChallenge(challenge, req.user._id);

        if (passed) {
            // Check if streak is consecutive (last check was yesterday)
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            if (!lastCheck || lastCheck.getTime() === yesterday.getTime()) {
                challenge.currentStreak += 1;
            } else {
                challenge.currentStreak = 1; // Reset streak
            }

            if (challenge.currentStreak > challenge.bestStreak) {
                challenge.bestStreak = challenge.currentStreak;
            }

            // Check if challenge completed
            if (challenge.currentStreak >= challenge.targetDays) {
                challenge.isActive = false;
                challenge.completedAt = new Date();
            }
        } else {
            challenge.currentStreak = 0; // Streak broken
        }

        challenge.lastCheckDate = today;
        await challenge.save();
        res.json(challenge);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// DELETE /api/challenges/:id — abandon a challenge
router.delete('/:id', async (req, res) => {
    try {
        await Challenge.findByIdAndDelete(req.params.id);
        res.json({ message: 'Challenge abandoned' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

async function verifyChallenge(challenge, userId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    switch (challenge.type) {
        case 'no_spend': {
            const expenses = await Transaction.countDocuments({
                userId,
                type: 'expense',
                date: { $gte: today, $lt: tomorrow }
            });
            return expenses === 0;
        }

        case 'daily_log': {
            const logged = await Transaction.countDocuments({
                userId,
                date: { $gte: today, $lt: tomorrow }
            });
            return logged > 0;
        }

        case 'under_budget': {
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const budgets = await Budget.find({ userId }).lean();
            if (budgets.length === 0) return true;

            const transactions = await Transaction.find({
                userId,
                type: 'expense',
                date: { $gte: startOfMonth, $lt: tomorrow }
            }).lean();

            const spendingByCategory = {};
            for (const tx of transactions) {
                spendingByCategory[tx.category] = (spendingByCategory[tx.category] || 0) + tx.amount;
            }

            return budgets.every(b => (spendingByCategory[b.category] || 0) <= b.amount);
        }

        case 'savings_streak': {
            const savingsTx = await Transaction.countDocuments({
                userId,
                category: 'Savings',
                date: { $gte: today, $lt: tomorrow }
            });
            return savingsTx > 0;
        }

        default:
            return false;
    }
}

module.exports = router;
