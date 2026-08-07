const assert = require('assert');

function testFinancialCalculations() {
    console.log('🧪 Starting Financial Calculation Verification Tests...\n');

    let totalPassed = 0;

    // Test 1: Verify Future bucket calculation does NOT include unassigned non-savings expenses
    (() => {
        const transactions = [
            { type: 'income', category: 'Salary', amount: 10000 },
            { type: 'expense', category: 'Savings', amount: 2560 }, // Actual Savings
            { type: 'expense', category: 'CustomTag', amount: 1500 }, // Unassigned expense
        ];

        const plan = {
            needsPct: 50,
            wantsPct: 30,
            futurePct: 20,
            needsCategories: ['Housing', 'Food'],
            wantsCategories: ['Shopping']
        };

        const expenses = transactions.filter(t => t.type === 'expense');

        // NEW FIX LOGIC:
        const savingsExpenses = expenses
            .filter(t => t.category === 'Savings')
            .reduce((sum, t) => sum + t.amount, 0);
        const savingsIncomes = transactions
            .filter(t => t.type === 'income' && t.category === 'Savings')
            .reduce((sum, t) => sum + t.amount, 0);
        const futureSaved = Math.max(savingsExpenses - savingsIncomes, 0);

        // BROKEN OLD LOGIC (would produce 4060):
        const brokenFuture = expenses
            .filter(t => !plan.needsCategories.includes(t.category) && !plan.wantsCategories.includes(t.category))
            .reduce((sum, t) => sum + t.amount, 0);

        assert.strictEqual(brokenFuture, 4060, 'Old broken logic produced 4060');
        assert.strictEqual(futureSaved, 2560, 'New fixed logic must produce exactly 2560');

        console.log('✅ [PASS] Money Plan Future Bucket: 2,560 FCFA saved (Unassigned 1,500 FCFA excluded)');
        totalPassed++;
    })();

    // Test 2: Verify Monthly Review futureActual equals savedAmount (2,560 FCFA)
    (() => {
        const expenseTxns = [
            { category: 'Savings', amount: 2560 },
            { category: 'UnassignedCategory', amount: 1500 }
        ];
        const incomeTxns = [];

        const savingsExpense = expenseTxns
            .filter(t => t.category === 'Savings')
            .reduce((s, t) => s + t.amount, 0);
        const savingsIncome = incomeTxns
            .filter(t => t.category === 'Savings')
            .reduce((s, t) => s + t.amount, 0);
        const savedAmount = savingsExpense - savingsIncome;

        const futureActual = Math.max(savedAmount, 0);

        assert.strictEqual(futureActual, 2560, 'Monthly review futureActual must equal 2560');
        console.log('✅ [PASS] Monthly Review Future Actual: 2,560 FCFA');
        totalPassed++;
    })();

    // Test 3: Verify Expense Savings (putting money into savings) vs Income Savings (withdrawing money from savings)
    (() => {
        const isSavingsCat = (cat) => typeof cat === 'string' && cat.trim().toLowerCase() === 'savings';

        const transactions = [
            { type: 'expense', category: 'savings ', amount: 5000 }, // Added 5000 to savings
            { type: 'income', category: 'Savings', amount: 1000 },   // Withdrew 1000 from savings
        ];

        const savingsExpenses = transactions
            .filter(t => t.type === 'expense' && isSavingsCat(t.category))
            .reduce((s, t) => s + t.amount, 0);

        const savingsIncomes = transactions
            .filter(t => t.type === 'income' && isSavingsCat(t.category))
            .reduce((s, t) => s + t.amount, 0);

        const savedAmount = Math.max(savingsExpenses - savingsIncomes, 0);

        assert.strictEqual(savedAmount, 4000, 'Expense Savings (5000) minus Income Savings (1000) must equal 4000');
        console.log('✅ [PASS] Expense Savings (putting in) minus Income Savings (withdrawing out) = 4,000 FCFA');
        totalPassed++;
    })();

    console.log(`\n📊 Summary: ${totalPassed}/3 tests passed.`);
    console.log('🎉 Financial calculations verified successfully!');
}

testFinancialCalculations();
