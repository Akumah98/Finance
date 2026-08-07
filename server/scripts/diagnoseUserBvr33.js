const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Category = require('../models/Category');
const MoneyPlan = require('../models/MoneyPlan');

async function diagnose() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB\n');

        // Find user bvr33 by username, name, or email containing bvr33
        const user = await User.findOne({
            $or: [
                { email: /bvr33/i },
                { name: /bvr33/i },
                { username: /bvr33/i }
            ]
        });

        if (!user) {
            console.log('User bvr33 not found by regex search. Listing all users:');
            const allUsers = await User.find({}, 'name email username _id');
            console.log(allUsers);
            return;
        }

        console.log('Found User:', { id: user._id, name: user.name, email: user.email });

        // Categories
        const categories = await Category.find({ userId: user._id });
        console.log('\n--- User Categories ---');
        console.log(categories.map(c => ({ id: c._id, name: c.name, type: c.type, icon: c.icon })));

        // Transactions
        const transactions = await Transaction.find({ userId: user._id }).sort({ date: -1 });
        console.log(`\n--- Transactions (${transactions.length} total) ---`);
        console.log(transactions.map(t => ({
            id: t._id,
            type: t.type,
            amount: t.amount,
            category: t.category,
            note: t.note,
            date: t.date
        })));

        // Money Plan
        const moneyPlan = await MoneyPlan.findOne({ userId: user._id });
        console.log('\n--- Money Plan ---');
        console.log(moneyPlan);

    } catch (err) {
        console.error('Error during diagnosis:', err);
    } finally {
        await mongoose.disconnect();
    }
}

diagnose();
