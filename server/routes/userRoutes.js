const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { getTierName, getTierEmoji, calculateLevel, getProgressToNextLevel } = require('../utils/achievementLevels');
const { protect } = require('../middleware/authMiddleware');

// Apply protection to all routes
router.use(protect);

// Get current user profile (useful for app startup sync)
router.get('/me', async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get user stats (streak and achievements with levels)
router.get('/:userId/stats', async (req, res) => {
    // Ensure user can only view their own stats
    if (req.params.userId !== req.user.id) {
        return res.status(401).json({ message: 'Not authorized' });
    }

    try {
        const user = await User.findById(req.params.userId).select('streak lastActivityDate achievements');
        if (!user) return res.status(404).json({ message: 'User not found' });

        const achievements = user.achievements || {
            budgetMaster: 0,
            savingsPro: 0,
            streakKing: 0,
            debtSlayer: 0
        };

        // Add tier information for each achievement
        const achievementsWithTiers = {
            budgetMaster: {
                level: achievements.budgetMaster,
                tier: getTierName(achievements.budgetMaster),
                emoji: getTierEmoji(achievements.budgetMaster)
            },
            savingsPro: {
                level: achievements.savingsPro,
                tier: getTierName(achievements.savingsPro),
                emoji: getTierEmoji(achievements.savingsPro)
            },
            streakKing: {
                level: achievements.streakKing,
                tier: getTierName(achievements.streakKing),
                emoji: getTierEmoji(achievements.streakKing)
            },
            debtSlayer: {
                level: achievements.debtSlayer,
                tier: getTierName(achievements.debtSlayer),
                emoji: getTierEmoji(achievements.debtSlayer)
            }
        };

        res.json({
            streak: user.streak || 0,
            lastActivityDate: user.lastActivityDate,
            achievements: achievementsWithTiers
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update user stats
router.patch('/:userId/stats', async (req, res) => {
    // Ensure user can only update their own stats
    if (req.params.userId !== req.user.id) {
        return res.status(401).json({ message: 'Not authorized' });
    }

    const { streak, lastActivityDate, achievements } = req.body;
    try {
        const updateData = {};
        if (streak !== undefined) updateData.streak = streak;
        if (lastActivityDate !== undefined) updateData.lastActivityDate = lastActivityDate;
        if (achievements !== undefined) {
            // Store only the level numbers
            updateData.achievements = {
                budgetMaster: achievements.budgetMaster || 0,
                savingsPro: achievements.savingsPro || 0,
                streakKing: achievements.streakKing || 0,
                debtSlayer: achievements.debtSlayer || 0
            };
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.params.userId,
            updateData,
            { new: true }
        ).select('streak lastActivityDate achievements');

        res.json({
            streak: updatedUser.streak || 0,
            lastActivityDate: updatedUser.lastActivityDate,
            achievements: updatedUser.achievements
        });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update user profile (name, email)
router.patch('/:userId/profile', async (req, res) => {
    // Ensure user can only update their own profile
    if (req.params.userId !== req.user.id) {
        return res.status(401).json({ message: 'Not authorized' });
    }

    const { userName, email } = req.body;
    try {
        const updateData = {};
        if (userName) updateData.userName = userName;
        if (email) updateData.email = email;

        const updatedUser = await User.findByIdAndUpdate(
            req.params.userId,
            updateData,
            { new: true }
        ).select('userName email');

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            id: updatedUser._id,
            userName: updatedUser.userName,
            email: updatedUser.email
        });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;
