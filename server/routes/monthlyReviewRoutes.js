const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const Bill = require('../models/Bill');
const MoneyPlan = require('../models/MoneyPlan');

// GET /api/monthly-review/:userId?year=2026&month=6
// month is 0-indexed (0 = January, 6 = July) matching JS Date convention
router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const now = new Date();

        // Default to current month; allow override via query params
        const year = parseInt(req.query.year) || now.getFullYear();
        const month = req.query.month !== undefined ? parseInt(req.query.month) : now.getMonth();

        const startOfMonth = new Date(year, month, 1);
        const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

        const [transactions, budgets, bills, plan] = await Promise.all([
            Transaction.find({ userId, date: { $gte: startOfMonth, $lte: endOfMonth } }),
            Budget.find({ userId }),
            Bill.find({ userId }),
            MoneyPlan.findOne({ userId }),
        ]);

        // ── Income & Expenses ────────────────────────────────────────────
        const totalIncome = transactions
            .filter(t => t.type === 'income')
            .reduce((s, t) => s + t.amount, 0);

        const expenseTxns = transactions.filter(t => t.type === 'expense');
        const totalExpenses = expenseTxns.reduce((s, t) => s + t.amount, 0);

        // ── Allocation buckets (planned vs actual) ───────────────────────
        const needsPct = plan?.needsPct ?? 50;
        const wantsPct = plan?.wantsPct ?? 30;
        const futurePct = plan?.futurePct ?? 20;

        const needsCategories = plan?.needsCategories ?? ['Housing', 'Food', 'Transport', 'Utilities', 'Healthcare', 'Groceries'];
        const wantsCategories = plan?.wantsCategories ?? ['Entertainment', 'Dining Out', 'Shopping', 'Subscriptions', 'Travel'];

        const needsActual = expenseTxns
            .filter(t => needsCategories.includes(t.category))
            .reduce((s, t) => s + t.amount, 0);

        const wantsActual = expenseTxns
            .filter(t => wantsCategories.includes(t.category))
            .reduce((s, t) => s + t.amount, 0);

        const futureActual = expenseTxns
            .filter(t => !needsCategories.includes(t.category) && !wantsCategories.includes(t.category))
            .reduce((s, t) => s + t.amount, 0);

        const needsPlanned = (needsPct / 100) * totalIncome;
        const wantsPlanned = (wantsPct / 100) * totalIncome;
        const futurePlanned = (futurePct / 100) * totalIncome;

        const buckets = {
            needs: {
                label: 'Needs',
                planned: needsPlanned,
                actual: needsActual,
                pct: needsPct,
                diff: needsPlanned - needsActual,
                status: needsActual <= needsPlanned ? 'ok' : 'over',
            },
            wants: {
                label: 'Wants',
                planned: wantsPlanned,
                actual: wantsActual,
                pct: wantsPct,
                diff: wantsPlanned - wantsActual,
                status: wantsActual <= wantsPlanned ? 'ok' : 'over',
            },
            future: {
                label: 'Future',
                planned: futurePlanned,
                actual: futureActual,
                pct: futurePct,
                diff: futurePlanned - futureActual,
                status: futureActual <= futurePlanned ? 'ok' : 'over',
            },
        };

        // ── Savings rate ────────────────────────────────────────────────
        const savedAmount = Math.max(totalIncome - totalExpenses, 0);
        const savingsRate = totalIncome > 0 ? (savedAmount / totalIncome) * 100 : 0;

        // ── Category breakdown ──────────────────────────────────────────
        const categoryMap = {};
        expenseTxns.forEach(t => {
            categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
        });

        const categoryList = Object.entries(categoryMap)
            .map(([category, amount]) => {
                const budget = budgets.find(b => b.category === category);
                return {
                    category,
                    amount,
                    budget: budget?.amount ?? null,
                    overBudget: budget ? amount > budget.amount : false,
                    overBy: budget ? Math.max(amount - budget.amount, 0) : 0,
                };
            })
            .sort((a, b) => b.amount - a.amount);

        // Top win: category most under budget (or least spent relative to budget)
        const topWin = categoryList
            .filter(c => c.budget && !c.overBudget)
            .sort((a, b) => (b.budget - b.amount) - (a.budget - a.amount))[0] || null;

        // Top miss: most overspent category
        const topMiss = categoryList
            .filter(c => c.overBudget)
            .sort((a, b) => b.overBy - a.overBy)[0] || null;

        // ── Bills this month ────────────────────────────────────────────
        const monthBills = bills.filter(b => {
            const d = new Date(b.dueDate);
            return d >= startOfMonth && d <= endOfMonth;
        });
        const paidBills = monthBills.filter(b => b.isPaid).length;
        const missedBills = monthBills.filter(b => !b.isPaid && new Date(b.dueDate) < now).length;

        // ── Actionable tip for next month ────────────────────────────────
        const getTip = () => {
            if (missedBills > 0) return `Pay your ${missedBills} overdue bill${missedBills > 1 ? 's' : ''} before next month starts.`;
            if (topMiss) return `Cut ${topMiss.category} spending by ${Math.round((topMiss.overBy / topMiss.amount) * 100)}% to stay within your budget next month.`;
            if (savingsRate < 10) return `You saved ${savingsRate.toFixed(1)}% this month. Try setting aside even 5% of each payment you receive.`;
            if (savingsRate < 20) return `Good work saving ${savingsRate.toFixed(1)}%! Push toward 20% by trimming your top spending category.`;
            if (buckets.wants.status === 'over') return `Wants bucket went over by ${(wantsActual - wantsPlanned).toFixed(0)}. Revisit your split or reduce discretionary spending.`;
            return `Excellent month! Keep the same habits and consider increasing your Future allocation by 5%.`;
        };

        res.json({
            period: {
                year,
                month,
                label: new Date(year, month, 1).toLocaleString('default', { month: 'long', year: 'numeric' }),
            },
            summary: {
                totalIncome,
                totalExpenses,
                savedAmount,
                savingsRate: parseFloat(savingsRate.toFixed(1)),
                savingsRateTarget: 20,
                netBalance: totalIncome - totalExpenses,
            },
            buckets,
            categoryBreakdown: categoryList,
            topWin,
            topMiss,
            bills: {
                total: monthBills.length,
                paid: paidBills,
                missed: missedBills,
            },
            tip: getTip(),
            hasPlan: !!plan,
        });
    } catch (err) {
        console.error('Monthly review error:', err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
