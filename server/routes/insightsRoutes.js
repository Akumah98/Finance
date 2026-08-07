const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const Bill = require('../models/Bill');
const SavingsGoal = require('../models/SavingsGoal');
const { analyzeSpending } = require('../utils/spendingAnalysis');
const { generateAIInsights } = require('../services/aiInsightsService');
const { calculateHealthScore } = require('../services/healthScoreService');
const insightsCache = require('../services/insightsCache');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', async (req, res) => {
    try {
        const userId = req.user._id;
        const forceRefresh = req.query.force === 'true';
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        const [transactions, budgetDocs, bills, goals] = await Promise.all([
            Transaction.find({ userId, date: { $gte: threeMonthsAgo } })
                .sort({ date: -1 })
                .select('-embedding')
                .lean(),
            Budget.find({ userId }).lean(),
            Bill.find({ userId, isPaid: false }).sort({ dueDate: 1 }).limit(10).lean(),
            SavingsGoal.find({ userId }).lean()
        ]);

        const budgets = {};
        budgetDocs.forEach(b => { budgets[b.category] = b.amount; });

        const thisMonthTransactions = transactions.filter(t => {
            const d = new Date(t.date);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });

        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        const lastMonthTransactions = transactions.filter(t => {
            const d = new Date(t.date);
            return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
        });

        const categorySpending = {};
        thisMonthTransactions.forEach(t => {
            if (t.type === 'expense') {
                categorySpending[t.category] = (categorySpending[t.category] || 0) + t.amount;
            }
        });

        const lastMonthCategorySpending = {};
        lastMonthTransactions.forEach(t => {
            if (t.type === 'expense') {
                lastMonthCategorySpending[t.category] = (lastMonthCategorySpending[t.category] || 0) + t.amount;
            }
        });

        const totalIncome = thisMonthTransactions
            .filter(t => t.type === 'income')
            .reduce((s, t) => s + t.amount, 0);

        const totalExpenses = thisMonthTransactions
            .filter(t => t.type === 'expense')
            .reduce((s, t) => s + t.amount, 0);

        const savingsExpense = thisMonthTransactions
            .filter(t => t.type === 'expense' && t.category === 'Savings')
            .reduce((s, t) => s + t.amount, 0);

        const savingsIncome = thisMonthTransactions
            .filter(t => t.type === 'income' && t.category === 'Savings')
            .reduce((s, t) => s + t.amount, 0);

        const savedAmount = savingsExpense - savingsIncome;
        const regularIncome = Math.max(totalIncome - savingsIncome, 0);

        const savingsRate = regularIncome > 0 ? (Math.max(savedAmount, 0) / regularIncome) * 100 : 0;

        // Generate rule-based insights as fallback
        const ruleBasedInsights = analyzeSpending(transactions, budgets);

        // Try AI-powered insights (with server-side cache check to save LLM quota)
        let aiResult = !forceRefresh ? insightsCache.get(userId) : null;

        if (!aiResult) {
            aiResult = await generateAIInsights({
                totalIncome,
                totalExpenses,
                savingsRate,
                categorySpending,
                lastMonthCategorySpending,
                budgets,
                recentTransactions: thisMonthTransactions.slice(0, 20),
                billsUpcoming: bills,
                goals: goals || []
            });

            if (aiResult && aiResult.success) {
                insightsCache.set(userId, aiResult);
            }
        }

        // Calculate unified exact health score
        const healthScoreData = await calculateHealthScore(userId);
        const unifiedScore = {
            value: healthScoreData.score,
            label: healthScoreData.grade,
            color: healthScoreData.color,
            tip: healthScoreData.tip,
        };

        if (aiResult.success) {
            const ai = aiResult.insights;

            res.json({
                weeklySummary: ai.weeklySummary || ruleBasedInsights.weeklySummary,
                overspendingAlerts: ruleBasedInsights.overspendingAlerts,
                recommendations: ai.recommendations || ruleBasedInsights.recommendations.map(r => ({ text: r, savings: null, priority: 'medium' })),
                budgets: ruleBasedInsights.budgets,
                cashFlowForecast: ruleBasedInsights.cashFlowForecast,
                anomalies: ai.anomalies || [],
                predictiveBudget: ai.predictiveBudget || null,
                score: unifiedScore,
                aiPowered: true
            });
        } else {
            res.json({
                ...ruleBasedInsights,
                anomalies: [],
                predictiveBudget: null,
                score: unifiedScore,
                aiPowered: false
            });
        }
    } catch (err) {
        console.error('Error generating insights:', err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
