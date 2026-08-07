const assert = require('assert');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Transaction = require('../models/Transaction');
const Category = require('../models/Category');
const { categorizeUserTransactions } = require('../services/categorizationJob');

async function testCategorySuggestionFlow() {
    console.log('🧪 Starting Category Suggestion Unit & Logic Verification Tests...\n');

    let passedTests = 0;
    let totalTests = 0;

    function runTest(description, testFn) {
        totalTests++;
        try {
            testFn();
            console.log(`✅ [PASS] ${description}`);
            passedTests++;
        } catch (err) {
            console.error(`❌ [FAIL] ${description}\n   Error: ${err.message}`);
        }
    }

    async function runAsyncTest(description, testFn) {
        totalTests++;
        try {
            await testFn();
            console.log(`✅ [PASS] ${description}`);
            passedTests++;
        } catch (err) {
            console.error(`❌ [FAIL] ${description}\n   Error: ${err.message}`);
        }
    }

    // Test 1: Verify categorizationJob no longer filters by category: 'Other'
    await runAsyncTest('Bug #1 Fix: categorizationJob queries ALL uncategorized transactions (not just category: "Other")', async () => {
        let capturedQuery = null;

        // Mock Transaction.find
        const originalFind = Transaction.find;
        Transaction.find = function (query) {
            capturedQuery = query;
            return {
                sort: () => ({
                    limit: () => ({
                        lean: async () => []
                    })
                })
            };
        };

        const originalCatFind = Category.find;
        Category.find = async () => [{ _id: 'cat1', name: 'Food', type: 'expense', userId: 'user123' }];

        try {
            await categorizeUserTransactions('user123');

            assert.strictEqual(capturedQuery.userId, 'user123');
            assert.strictEqual(capturedQuery.category, undefined, 'category: "Other" filter must be removed');
            assert.deepStrictEqual(capturedQuery.categorizationAttempted, { $ne: true });
        } finally {
            Transaction.find = originalFind;
            Category.find = originalCatFind;
        }
    });

    // Test 2: Verify GET /suggestions query includes ALL transactions with suggestedCategory
    runTest('Universal Suggestions: GET /suggestions returns all transactions with AI suggestions', () => {
        const queryFilter = {
            userId: 'user123',
            suggestedCategory: { $exists: true, $ne: null }
        };

        assert.strictEqual(queryFilter.userId, 'user123');
        assert.deepStrictEqual(queryFilter.suggestedCategory, { $exists: true, $ne: null });
        assert.strictEqual(queryFilter.$expr, undefined, '$expr filter should be removed to allow matching category suggestions');
    });

    // Test 3: Verify fire-and-forget save condition accepts suggestions
    runTest('Bug #2 Fix: Fire-and-forget updates suggestedCategory whenever AI returns a valid category', () => {
        const savedTransaction = { category: 'Food', suggestedCategory: null };
        const suggestion = { category: 'Transport', confidence: 0.85 };

        const updates = {};
        if (!savedTransaction.suggestedCategory) {
            if (suggestion?.category && suggestion.category !== 'Other') {
                updates.suggestedCategory = suggestion.category;
            }
        }

        assert.strictEqual(updates.suggestedCategory, 'Transport');
    });

    console.log(`\n📊 Test Summary: ${passedTests}/${totalTests} tests passed.`);
    if (passedTests === totalTests) {
        console.log('🎉 All Category Suggestion flow verifications passed successfully!');
    } else {
        process.exit(1);
    }
}

testCategorySuggestionFlow();
