const mongoose = require('mongoose');

const BillSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    dueDate: {
        type: Date,
        required: true
    },
    frequency: {
        type: String,
        enum: ['One-time', 'Weekly', 'Monthly', 'Yearly'],
        default: 'Monthly'
    },
    category: {
        type: String,
        default: 'Other'
    },
    isPaid: {
        type: Boolean,
        default: false
    },
    linkedTransactionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction',
        default: null
    },
    autoPay: {
        type: Boolean,
        default: false
    },
    companyLogo: {
        type: String // URL or icon name
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Bill', BillSchema);
