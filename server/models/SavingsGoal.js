const mongoose = require('mongoose');

const SavingsGoalSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    targetAmount: {
        type: Number,
        required: true
    },
    currentAmount: {
        type: Number,
        default: 0
    },
    deadline: {
        type: Date
    },
    icon: {
        type: String, // MaterialCommunityIcons name
        default: 'piggy-bank'
    },
    color: {
        type: String,
        default: '#10B981' // Emerald-500
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('SavingsGoal', SavingsGoalSchema);
