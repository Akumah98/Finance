const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Message = require('../models/Message');
const Transaction = require('../models/Transaction');
const Bill = require('../models/Bill');
const SavingsGoal = require('../models/SavingsGoal');
const Budget = require('../models/Budget');
const MoneyPlan = require('../models/MoneyPlan');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Build a context-rich system prompt from the user's live financial data
const buildSystemPrompt = (context) => {
    const { income, expenses, savingsRate, topCategories, budgetStatus, overdueBills, goals, plan } = context;

    return `You are Glitch Assistant, a friendly and knowledgeable personal finance coach inside the Glitch app.
You have access to the user's real financial data for this month. Use it to give specific, actionable advice.
Never make up numbers — only reference the data provided below.
Keep responses concise (2–4 sentences max unless the user asks for detail).
Be encouraging but honest. If something looks bad, say so clearly but constructively.

=== USER'S FINANCIAL SNAPSHOT (THIS MONTH) ===
Total income logged: ${income.toFixed(2)}
Total expenses: ${expenses.toFixed(2)}
Savings rate: ${savingsRate.toFixed(1)}% (target: 20%)

Allocation plan: ${plan ? `Needs ${plan.needsPct}% / Wants ${plan.wantsPct}% / Future ${plan.futurePct}%` : 'Not set up yet'}

Top spending categories:
${topCategories.length > 0
    ? topCategories.map(c => `  - ${c.category}: ${c.amount.toFixed(2)} ${c.overBudget ? '(OVER BUDGET)' : ''}`).join('\n')
    : '  No expenses logged yet'}

Budget status:
${budgetStatus.length > 0
    ? budgetStatus.map(b => `  - ${b.category}: spent ${b.spent.toFixed(2)} of ${b.budget.toFixed(2)} (${b.pct.toFixed(0)}%)`).join('\n')
    : '  No budgets set'}

Overdue unpaid bills:
${overdueBills.length > 0
    ? overdueBills.map(b => `  - ${b.name}: ${b.amount.toFixed(2)} (due ${new Date(b.dueDate).toLocaleDateString()})`).join('\n')
    : '  None — great!'}

Savings goals:
${goals.length > 0
    ? goals.map(g => `  - ${g.name}: ${g.currentAmount.toFixed(2)} / ${g.targetAmount.toFixed(2)} (${Math.round((g.currentAmount / g.targetAmount) * 100)}%)`).join('\n')
    : '  No savings goals set'}
=== END OF SNAPSHOT ===

Answer the user's question using this data. If they ask something unrelated to personal finance, politely redirect them.`;
};

// Gather all the user's financial context in one shot
const getUserContext = async (userId) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const [transactions, bills, goals, budgets, plan] = await Promise.all([
        Transaction.find({ userId, date: { $gte: startOfMonth, $lte: endOfMonth } }),
        Bill.find({ userId }),
        SavingsGoal.find({ userId }),
        Budget.find({ userId }),
        MoneyPlan.findOne({ userId }),
    ]);

    const income = transactions
        .filter(t => t.type === 'income')
        .reduce((s, t) => s + t.amount, 0);

    const expenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((s, t) => s + t.amount, 0);

    const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;

    // Top 5 spending categories
    const categoryMap = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
        categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
    });
    const topCategories = Object.entries(categoryMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([category, amount]) => {
            const budget = budgets.find(b => b.category === category);
            return { category, amount, overBudget: budget ? amount > budget.amount : false };
        });

    // Budget status
    const budgetStatus = budgets.map(b => ({
        category: b.category,
        budget: b.amount,
        spent: categoryMap[b.category] || 0,
        pct: ((categoryMap[b.category] || 0) / b.amount) * 100,
    }));

    // Overdue unpaid bills
    const overdueBills = bills.filter(b => !b.isPaid && new Date(b.dueDate) < now);

    return { income, expenses, savingsRate, topCategories, budgetStatus, overdueBills, goals, plan };
};

// GET /api/chat/:userId — fetch message history
router.get('/:userId', async (req, res) => {
    try {
        const messages = await Message.find({ userId: req.params.userId }).sort({ createdAt: 1 });
        res.json(messages);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// DELETE /api/chat/:userId — clear chat history
router.delete('/:userId', async (req, res) => {
    try {
        await Message.deleteMany({ userId: req.params.userId });
        res.json({ message: 'Chat history cleared' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /api/chat — send a message and get a Gemini response
router.post('/', async (req, res) => {
    const { userId, text } = req.body;

    if (!text || !userId) {
        return res.status(400).json({ message: 'userId and text are required' });
    }

    try {
        // 1. Save user message
        const userMessage = new Message({ userId, text, role: 'user' });
        await userMessage.save();

        // 2. Fetch recent history (last 20 messages for context window)
        const history = await Message.find({ userId })
            .sort({ createdAt: -1 })
            .limit(21) // 21 to exclude the message we just saved
            .then(msgs => msgs.reverse());

        // Remove the last entry (the message we just saved — we'll pass it as the current turn)
        const priorHistory = history.slice(0, -1);

        // 3. Build Gemini chat history format
        const geminiHistory = priorHistory.map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.text }],
        }));

        // 4. Gather financial context and build system prompt
        const context = await getUserContext(userId);
        const systemPrompt = buildSystemPrompt(context);

        // 5. Call Gemini
        const model = genAI.getGenerativeModel({
            model: 'gemini-3.1-flash-lite',
            systemInstruction: systemPrompt,
        });

        const chat = model.startChat({ history: geminiHistory });
        const result = await chat.sendMessage(text);
        const responseText = result.response.text();

        // 6. Save and return AI response
        const aiMessage = new Message({ userId, text: responseText, role: 'assistant' });
        await aiMessage.save();

        res.json(aiMessage);
    } catch (err) {
        console.error('Gemini chat error:', err);

        // Graceful fallback if Gemini fails (e.g. API key not set yet)
        const fallback = new Message({
            userId,
            text: "I'm having trouble connecting right now. Please try again in a moment.",
            role: 'assistant',
        });
        await fallback.save();
        res.json(fallback);
    }
});

module.exports = router;
