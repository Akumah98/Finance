const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Category = require('../models/Category');
const Transaction = require('../models/Transaction');

async function cleanDuplicateCategories() {
    console.log('🧹 Starting Category Duplicates Cleanup Script...\n');

    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB\n');

        // Find all categories matching "savings" (case-insensitive)
        const savingsCategories = await Category.find({
            name: { $regex: /^savings$/i }
        });

        console.log(`Found ${savingsCategories.length} Savings category documents across DB.`);

        // Group categories by userId and type
        const grouped = {};
        for (const cat of savingsCategories) {
            const groupKey = `${cat.userId}_${cat.type || 'expense'}`;
            if (!grouped[groupKey]) grouped[groupKey] = [];
            grouped[groupKey].push(cat);
        }

        let totalMerged = 0;
        let totalTxnsUpdated = 0;

        for (const [key, cats] of Object.entries(grouped)) {
            if (cats.length <= 1) continue;

            console.log(`\nProcessing user/type group: ${key} (${cats.length} duplicates)`);

            // Keep the first default one or standard named "Savings"
            const primary = cats.find(c => c.name === 'Savings' && (c.icon === 'piggy-bank' || c._id.toString().startsWith('def_'))) || cats[0];
            const duplicateIds = cats.filter(c => c._id.toString() !== primary._id.toString()).map(c => c._id);

            // Update any transactions referencing variations of savings category name
            const txResult = await Transaction.updateMany(
                { category: { $in: cats.map(c => c.name) } },
                { $set: { category: 'Savings' } }
            );
            totalTxnsUpdated += txResult.modifiedCount;

            // Delete duplicate category documents
            const delResult = await Category.deleteMany({ _id: { $in: duplicateIds } });
            totalMerged += delResult.deletedCount;

            console.log(`  - Retained Primary Category ID: ${primary._id} (${primary.name})`);
            console.log(`  - Deleted ${delResult.deletedCount} duplicate category records.`);
            console.log(`  - Updated ${txResult.modifiedCount} transactions to category "Savings".`);
        }

        // Also fix any transactions that have non-canonical casing like 'savings' or 'SAVINGS'
        const caseResult = await Transaction.updateMany(
            { category: { $in: ['savings', 'SAVINGS', 'Savings '] } },
            { $set: { category: 'Savings' } }
        );
        totalTxnsUpdated += caseResult.modifiedCount;

        console.log(`\n🎉 Cleanup Complete!`);
        console.log(`   - Merged Category Records: ${totalMerged}`);
        console.log(`   - Normalized Transactions: ${totalTxnsUpdated}\n`);

    } catch (err) {
        console.error('❌ Error during cleanup:', err.message);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

cleanDuplicateCategories();
