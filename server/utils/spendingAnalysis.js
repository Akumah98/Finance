// Rule-based spending analysis utility

// Analyze spending patterns and generate insights
const analyzeSpending = (transactions, budgets = {}) => {
    const insights = {
        weeklySummary: '',
        overspendingAlerts: [],
        recommendations: [],
        budgets: [],
        cashFlowForecast: {
            current: 0,
            projected: 0,
            trend: 'stable'
        }
    };

    if (!transactions || transactions.length === 0) {
        insights.weeklySummary = "Start tracking your expenses to see personalized insights!";
        return insights;
    }

    // Get current date and time periods
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Filter transactions by time periods
    const thisMonthTransactions = transactions.filter(t => {
        const date = new Date(t.date);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    const lastMonthTransactions = transactions.filter(t => {
        const date = new Date(t.date);
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
    });

    // Calculate spending by category for this month
    const categorySpending = {};
    thisMonthTransactions.forEach(t => {
        if (t.type === 'expense') {
            categorySpending[t.category] = (categorySpending[t.category] || 0) + parseFloat(t.amount);
        }
    });

    // Calculate last month's spending by category for comparison
    const lastMonthCategorySpending = {};
    lastMonthTransactions.forEach(t => {
        if (t.type === 'expense') {
            lastMonthCategorySpending[t.category] = (lastMonthCategorySpending[t.category] || 0) + parseFloat(t.amount);
        }
    });

    // Generate overspending alerts (Hybrid approach)
    const alerts = [];

    Object.keys(categorySpending).forEach(category => {
        const spent = categorySpending[category];
        const budget = budgets[category];
        const lastMonthSpent = lastMonthCategorySpending[category] || 0;

        // Budget-based alert (if budget exists)
        if (budget && spent > budget) {
            const overBy = spent - budget;
            const percentOver = ((overBy / budget) * 100).toFixed(1);

            alerts.push({
                category,
                spent: spent.toFixed(2),
                budget: budget.toFixed(2),
                overBy: overBy.toFixed(2),
                percentOver: parseFloat(percentOver),
                severity: percentOver > 50 ? 'critical' : percentOver > 20 ? 'warning' : 'notice',
                type: 'budget',
                icon: getCategoryIcon(category),
                suggestion: getBudgetSuggestion(category)
            });
        }
        // Pattern-based alert (if no budget set, compare to last month)
        else if (!budget && lastMonthSpent > 0) {
            const change = spent - lastMonthSpent;
            const percentChange = ((change / lastMonthSpent) * 100).toFixed(1);

            if (parseFloat(percentChange) > 20) {
                alerts.push({
                    category,
                    spent: spent.toFixed(2),
                    lastMonth: lastMonthSpent.toFixed(2),
                    change: change.toFixed(2),
                    percentChange: parseFloat(percentChange),
                    severity: percentChange > 50 ? 'warning' : 'notice',
                    type: 'pattern',
                    icon: getCategoryIcon(category),
                    suggestion: `Spending up ${percentChange}% vs last month`
                });
            }
        }
    });

    // Sort alerts by severity
    const severityOrder = { critical: 0, warning: 1, notice: 2 };
    insights.overspendingAlerts = alerts
        .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
        .slice(0, 5); // Top 5 alerts

    // Generate weekly summary
    insights.weeklySummary = generateWeeklySummary(categorySpending, lastMonthCategorySpending, budgets);

    // Generate smart recommendations
    insights.recommendations = generateRecommendations(categorySpending, budgets, transactions);

    // Build budget progress data
    insights.budgets = Object.keys(budgets).map(category => {
        const spent = categorySpending[category] || 0;
        const total = budgets[category];
        return {
            category,
            spent: spent.toFixed(2),
            total: total.toFixed(2),
            percentage: ((spent / total) * 100).toFixed(1),
            color: getProgressColor(spent, total)
        };
    });

    // Check if we have enough data for a 3-month forecast
    const oldestTransaction = transactions[transactions.length - 1]; // Assuming sorted by date descending (newest first)
    const oldestDate = new Date(oldestTransaction.date);
    const timeDiff = now.getTime() - oldestDate.getTime();
    const daysDiff = timeDiff / (1000 * 3600 * 24);

    if (daysDiff >= 90) {
        // Calculate detailed 30-day cash flow forecast
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());

        // Get last 3 months transactions for averaging
        const last3MonthsTransactions = transactions.filter(t => {
            const date = new Date(t.date);
            return date >= threeMonthsAgo;
        });

        // Calculate average monthly income (last 3 months)
        const incomeTransactions = last3MonthsTransactions.filter(t => t.type === 'income');
        const totalIncome = incomeTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
        const avgMonthlyIncome = incomeTransactions.length > 0 ? totalIncome / 3 : 0;

        // Calculate average monthly expenses (last 3 months)
        const expenseTransactions = last3MonthsTransactions.filter(t => t.type === 'expense');
        const totalExpenses = expenseTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
        const avgMonthlyExpenses = expenseTransactions.length > 0 ? totalExpenses / 3 : 0;

        // Calculate this month's actual income and expenses so far
        const thisMonthIncome = thisMonthTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);

        const thisMonthExpenses = thisMonthTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);

        // Calculate expected income and expenses for next 30 days
        const expectedIncome = avgMonthlyIncome > 0 ? avgMonthlyIncome : thisMonthIncome;
        const expectedExpenses = avgMonthlyExpenses > 0 ? avgMonthlyExpenses : thisMonthExpenses;

        // Net cash flow forecast
        const netFlow = expectedIncome - expectedExpenses;
        const currentBalance = thisMonthIncome - thisMonthExpenses; // Simplified - in production, fetch from account
        const projectedBalance = currentBalance + netFlow;

        // Determine trend and generate insight
        let trend = 'stable';
        let insight = 'Monitoring your cash flow';

        if (netFlow > 0) {
            trend = 'positive';
            insight = `On track to save $${netFlow.toFixed(0)} this month`;
        } else if (netFlow < 0) {
            trend = 'negative';
            insight = `Expected deficit of $${Math.abs(netFlow).toFixed(0)}`;
        } else {
            insight = 'Breaking even this month';
        }

        insights.cashFlowForecast = {
            expectedIncome: expectedIncome.toFixed(2),
            expectedExpenses: expectedExpenses.toFixed(2),
            netFlow: netFlow.toFixed(2),
            trend,
            insight,
            currentBalance: currentBalance.toFixed(2),
            projectedBalance: projectedBalance.toFixed(2),
            hasEnoughData: true
        };
    } else {
        insights.cashFlowForecast = {
            hasEnoughData: false,
            daysRemaining: 90 - Math.floor(daysDiff)
        };
    }
    return insights;
};

// Helper: Get category icon
const getCategoryIcon = (category) => {
    const iconMap = {
        'Shopping': 'shopping',
        'Food': 'food',
        'Dining': 'restaurant',
        'Entertainment': 'gamepad-2',
        'Transport': 'car',
        'Groceries': 'cart',
        'Bills': 'receipt',
        'Health': 'medical',
        'Education': 'school'
    };
    return iconMap[category] || 'cash';
};

// Helper: Get budget suggestion
const getBudgetSuggestion = (category) => {
    const suggestions = {
        'Shopping': 'Limit online purchases this week',
        'Food': 'Cook at home 3x this week',
        'Dining': 'Try meal prep to save on dining out',
        'Entertainment': 'Look for free local events',
        'Transport': 'Consider carpooling or public transit'
    };
    return suggestions[category] || `Reduce ${category} spending`;
};

// Helper: Generate weekly summary
const generateWeeklySummary = (current, lastMonth, budgets) => {
    const categories = Object.keys(current);
    if (categories.length === 0) return "Keep tracking to see your progress!";

    // Find biggest improvement
    let bestCategory = null;
    let bestImprovement = 0;

    categories.forEach(cat => {
        const currentSpent = current[cat] || 0;
        const lastSpent = lastMonth[cat] || 0;

        if (lastSpent > 0) {
            const improvement = ((lastSpent - currentSpent) / lastSpent) * 100;
            if (improvement > bestImprovement) {
                bestImprovement = improvement;
                bestCategory = cat;
            }
        }
    });

    if (bestCategory && bestImprovement > 5) {
        return `Great progress! You're spending ${bestImprovement.toFixed(0)}% less on ${bestCategory} this month. Keep it up!`;
    }

    return "Stay mindful of your spending habits to reach your financial goals!";
};

// Helper: Generate recommendations
const generateRecommendations = (spending, budgets, transactions) => {
    const recommendations = [];

    // High spending categories
    const sortedCategories = Object.entries(spending)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3);

    sortedCategories.forEach(([category, amount]) => {
        if (amount > 200) {
            recommendations.push(`Review ${category} expenses → Potential to save $${(amount * 0.2).toFixed(0)}/month`);
        }
    });

    // Generic money-saving tips
    if (recommendations.length < 3) {
        recommendations.push("Set up automatic savings transfers");
        recommendations.push("Track daily spending to stay aware");
    }

    return recommendations.slice(0, 5);
};

// Helper: Get progress bar color
const getProgressColor = (spent, total) => {
    const percentage = (spent / total) * 100;
    if (percentage >= 100) return '#EF4444'; // Red - over budget
    if (percentage >= 80) return '#F59E0B'; // Amber - warning
    if (percentage >= 50) return '#3B82F6'; // Blue - on track
    return '#10B981'; // Green - good
};

module.exports = {
    analyzeSpending
};
