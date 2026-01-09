const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    icon: {
        type: String,
        default: 'shape' // default icon
    },
    color: {
        type: String,
        default: '#3B82F6' // default blue
    },
    type: {
        type: String,
        enum: ['expense', 'income'],
        default: 'expense'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Category', CategorySchema);
