const mongoose = require('mongoose');

const BillHistorySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    billName: {
        type: String,
        required: true
    },
    changeType: {
        type: String,
        enum: ['CREATED', 'UPDATED', 'DELETED', 'PAID'],
        required: true
    },
    details: {
        type: String, // e.g., "Amount increased from $10 to $12"
        required: true
    },
    reason: {
        type: String // Optional reason provided by user
    },
    amount: {
        type: Number // Snapshot of amount at time of log
    },
    billCreatedAt: {
        type: Date // When the original bill was created
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('BillHistory', BillHistorySchema);
