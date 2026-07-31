const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const Bill = require('../models/Bill');
const SavingsGoal = require('../models/SavingsGoal');

async function calculateHealthScore(userId) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const [transactions, budgets, bills, goals] = await Promise.all([
        Transaction.find({ userId, date: { $gte: startOfMonth, $lte: endOfMonth } }),
        Budget.find({ userId }),
        Bill.find({ userId }),
        SavingsGoal.find({ userId }),
    ]);

    const thisMonthTxns = transactions;

    const monthlyIncome = thisMonthTxns
        .filter(t => t.type === 'income')
        .reduce((s, t) => s + t.amount, 0);

    const monthlyExpenses = thisMonthTxns
        .filter(t => t.type === 'expense')
        .reduce((s, t) => s + t.amount, 0);

    // Signal 1: Emergency Fund (25 pts)
    let emergencyScore = 0;
    let emergencyDetails = { label: 'No emergency fund goal found', value: 0, target: 0 };

    const emergencyGoal = goals.find(g => /emergency/i.test(g.name));
    if (emergencyGoal) {
        const threeMonthTarget = monthlyExpenses * 3 || emergencyGoal.targetAmount;
        const ratio = emergencyGoal.currentAmount / threeMonthTarget;
        emergencyScore = Math.round(Math.min(ratio, 1) * 25);
        emergencyDetails = {
            label: 'Emergency fund',
            value: emergencyGoal.currentAmount,
            target: threeMonthTarget,
            pct: Math.round(ratio * 100),
        };
    }

    // Signal 2: Savings Rate (25 pts)
    let savingsScore = 0;
    let savingsDetails = { label: 'Savings rate', rate: 0, targetRate: 20 };

    if (monthlyIncome > 0) {
        const saved = Math.max(monthlyIncome - monthlyExpenses, 0);
        const rate = (saved / monthlyIncome) * 100;
        savingsScore = Math.round(Math.min(rate / 20, 1) * 25);
        savingsDetails = {
            label: 'Savings rate',
            rate: parseFloat(rate.toFixed(1)),
            targetRate: 20,
        };
    }

    // Signal 3: Budget Adherence (25 pts)
    let budgetScore = 0;
    let budgetDetails = { label: 'Budget adherence', kept: 0, total: 0 };

    if (budgets.length > 0) {
        const categorySpending = {};
        thisMonthTxns
            .filter(t => t.type === 'expense')
            .forEach(t => {
                categorySpending[t.category] = (categorySpending[t.category] || 0) + t.amount;
            });

        const withinBudget = budgets.filter(b => {
            const spent = categorySpending[b.category] || 0;
            return spent <= b.amount;
        });

        const ratio = withinBudget.length / budgets.length;
        budgetScore = Math.round(ratio * 25);
        budgetDetails = {
            label: 'Budget adherence',
            kept: withinBudget.length,
            total: budgets.length,
            pct: Math.round(ratio * 100),
        };
    } else {
        budgetDetails = { label: 'Budget adherence', kept: 0, total: 0, noBudgets: true };
    }

    // Signal 4: Bills On Time (25 pts)
    let billsScore = 25;
    let billsDetails = { label: 'Bills on time', overdue: 0, total: bills.length };

    const overdueBills = bills.filter(b => {
        if (b.isPaid) return false;
        return new Date(b.dueDate) < now;
    });

    if (bills.length > 0) {
        const overdueRatio = overdueBills.length / bills.length;
        billsScore = Math.round((1 - overdueRatio) * 25);
        billsDetails = {
            label: 'Bills on time',
            overdue: overdueBills.length,
            total: bills.length,
            pct: Math.round((1 - overdueRatio) * 100),
        };
    }

    const totalScore = emergencyScore + savingsScore + budgetScore + billsScore;

    const getGrade = (score) => {
        if (score >= 85) return { grade: 'Excellent', color: '#10B981' };
        if (score >= 70) return { grade: 'Good', color: '#3B82F6' };
        if (score >= 50) return { grade: 'Fair', color: '#F59E0B' };
        return { grade: 'Needs Work', color: '#EF4444' };
    };

    const getTip = () => {
        const signals = [
            { score: emergencyScore, max: 25, tip: 'Start or grow your emergency fund — aim for 3 months of expenses.' },
            { score: savingsScore, max: 25, tip: 'Try to save at least 20% of your income each month.' },
            { score: budgetScore, max: 25, tip: budgets.length === 0 ? 'Set budgets for your top spending categories.' : 'Some categories went over budget — review your spending.' },
            { score: billsScore, max: 25, tip: 'Pay overdue bills to protect your score.' },
        ];
        const weakest = [...signals].sort((a, b) => (a.score / a.max) - (b.score / b.max))[0];
        return weakest.tip;
    };

    const gradeInfo = getGrade(totalScore);

    return {
        score: totalScore,
        grade: gradeInfo.grade,
        color: gradeInfo.color,
        tip: getTip(),
        breakdown: {
            emergencyFund: { score: emergencyScore, max: 25, ...emergencyDetails },
            savingsRate: { score: savingsScore, max: 25, ...savingsDetails },
            budgetAdherence: { score: budgetScore, max: 25, ...budgetDetails },
            billsOnTime: { score: billsScore, max: 25, ...billsDetails },
        },
    };
}

module.exports = { calculateHealthScore };
