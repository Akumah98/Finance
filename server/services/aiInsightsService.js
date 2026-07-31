const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function generateAIInsights(financialData) {
    const {
        totalIncome,
        totalExpenses,
        savingsRate,
        categorySpending,
        lastMonthCategorySpending,
        budgets,
        recentTransactions,
        billsUpcoming,
        goals
    } = financialData;

    const categoryBreakdown = Object.entries(categorySpending)
        .sort(([, a], [, b]) => b - a)
        .map(([cat, amount]) => {
            const budget = budgets[cat];
            const lastMonth = lastMonthCategorySpending[cat] || 0;
            const change = lastMonth > 0 ? (((amount - lastMonth) / lastMonth) * 100).toFixed(0) : null;
            return `${cat}: ${amount.toFixed(0)} spent${budget ? ` (budget: ${budget})` : ''}${change ? ` [${change > 0 ? '+' : ''}${change}% vs last month]` : ''}`;
        })
        .join('\n');

    const goalsText = goals.length > 0
        ? goals.map(g => `${g.name}: ${g.currentAmount}/${g.targetAmount} (${((g.currentAmount / g.targetAmount) * 100).toFixed(0)}%)`).join('\n')
        : 'No savings goals set';

    const billsText = billsUpcoming.length > 0
        ? billsUpcoming.map(b => `${b.name}: ${b.amount} due ${new Date(b.dueDate).toLocaleDateString()}`).join('\n')
        : 'No upcoming bills';

    const prompt = `You are an expert personal finance analyst. Analyze this user's financial data and provide insights.

=== FINANCIAL SNAPSHOT ===
Income this month: ${totalIncome.toFixed(2)}
Expenses this month: ${totalExpenses.toFixed(2)}
Net savings: ${(totalIncome - totalExpenses).toFixed(2)}
Savings rate: ${savingsRate.toFixed(1)}%

=== SPENDING BY CATEGORY ===
${categoryBreakdown || 'No expenses recorded yet'}

=== SAVINGS GOALS ===
${goalsText}

=== UPCOMING BILLS ===
${billsText}

=== INSTRUCTIONS ===
Respond with a JSON object (no markdown, no code fences) with these fields:
{
  "weeklySummary": "A 1-2 sentence personalized insight about their spending this week/month. Be specific — reference actual categories and amounts. Be encouraging but honest.",
  "anomalies": [
    {"category": "string", "description": "string", "severity": "warning|notice", "amount": number}
  ],
  "recommendations": [
    {"text": "string", "savings": "string", "priority": "high|medium|low"}
  ],
  "predictiveBudget": {
    "projectedEndOfMonth": number,
    "suggestion": "string"
  },
  "score": {
    "value": number,
    "label": "string",
    "tip": "string"
  }
}

Rules:
- anomalies: unusual spending spikes (>30% above last month) or categories that are way over budget. Max 3 items.
- recommendations: specific, actionable advice based on THEIR data. Reference real categories and amounts. Max 4 items. Include estimated savings amount.
- predictiveBudget: based on current spending rate, project what their balance will be at month end. Give one sentence of advice.
- score: rate their financial health 1-100 based on savings rate, budget adherence, and spending patterns. Label should be like "Good", "Excellent", "Needs Attention". Tip is one action to improve score.
- If there's not enough data, still provide helpful generic advice but note it in weeklySummary.`;

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(cleaned);

        return {
            success: true,
            insights: parsed
        };
    } catch (err) {
        console.error('AI Insights generation failed:', err.message);
        return {
            success: false,
            error: err.message
        };
    }
}

module.exports = { generateAIInsights };
