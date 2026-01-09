const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    userName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    phoneNumber: {
        type: String,
        default: ''
    },
    password: {
        type: String,
        required: true
    },
    streak: {
        type: Number,
        default: 0
    },
    lastActivityDate: {
        type: Date,
        default: null
    },
    achievements: {
        budgetMaster: { type: Number, default: 0, min: 0, max: 100 },
        savingsPro: { type: Number, default: 0, min: 0, max: 100 },
        streakKing: { type: Number, default: 0, min: 0, max: 100 },
        debtSlayer: { type: Number, default: 0, min: 0, max: 100 }
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('User', UserSchema);
