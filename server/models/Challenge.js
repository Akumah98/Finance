const mongoose = require('mongoose');

const ChallengeSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['no_spend', 'daily_log', 'under_budget', 'savings_streak'],
        required: true
    },
    name: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    targetDays: {
        type: Number,
        required: true
    },
    currentStreak: {
        type: Number,
        default: 0
    },
    bestStreak: {
        type: Number,
        default: 0
    },
    lastCheckDate: {
        type: Date
    },
    startDate: {
        type: Date,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: true
    },
    completedAt: {
        type: Date
    },
    category: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Challenge', ChallengeSchema);
