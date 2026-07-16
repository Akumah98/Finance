const mongoose = require('mongoose');

const MoneyPlanSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    needsPct: {
        type: Number,
        default: 50,
        min: 0,
        max: 100
    },
    wantsPct: {
        type: Number,
        default: 30,
        min: 0,
        max: 100
    },
    futurePct: {
        type: Number,
        default: 20,
        min: 0,
        max: 100
    },
    // Which expense categories count as "Needs" vs "Wants"
    needsCategories: {
        type: [String],
        default: ['Housing', 'Food', 'Transport', 'Utilities', 'Healthcare', 'Groceries']
    },
    wantsCategories: {
        type: [String],
        default: ['Entertainment', 'Dining Out', 'Shopping', 'Subscriptions', 'Travel']
    },
    // "Future" catches savings goal contributions and anything not in needs/wants
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('MoneyPlan', MoneyPlanSchema);
