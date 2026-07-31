const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Message = require('../models/Message');
const Transaction = require('../models/Transaction');
const Bill = require('../models/Bill');
const SavingsGoal = require('../models/SavingsGoal');
const Budget = require('../models/Budget');
const MoneyPlan = require('../models/MoneyPlan');
const { protect } = require('../middleware/authMiddleware');
const { generateEmbedding, buildMessageText } = require('../services/embeddingService');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.use(protect);

const buildSystemPrompt = (context, ragContext) => {
    const { income, expenses, savingsRate, topCategories, budgetStatus, overdueBills, goals, plan } = context;

    let ragSection = '';
    if (ragContext && ragContext.length > 0) {
        ragSection = `\n\n=== RELEVANT PAST CONVERSATIONS ===
${ragContext.map(m => `[${m.role}]: ${m.text}`).join('\n')}
=== END PAST CONVERSATIONS ===
Use this past context if relevant to the user's current question. It shows previous advice you gave and topics discussed.`;
    }

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
=== END OF SNAPSHOT ===${ragSection}

Answer the user's question using this data. If they ask something unrelated to personal finance, politely redirect them.`;
};

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

    const budgetStatus = budgets.map(b => ({
        category: b.category,
        budget: b.amount,
        spent: categoryMap[b.category] || 0,
        pct: ((categoryMap[b.category] || 0) / b.amount) * 100,
    }));

    const overdueBills = bills.filter(b => !b.isPaid && new Date(b.dueDate) < now);

    return { income, expenses, savingsRate, topCategories, budgetStatus, overdueBills, goals, plan };
};

// RAG: retrieve semantically similar past messages (Atlas Vector Search with fallback)
async function retrieveRelevantHistory(userId, queryText, excludeIds = []) {
    try {
        const queryEmbedding = await generateEmbedding(queryText);
        if (!queryEmbedding) return [];

        // Try Atlas Vector Search first
        try {
            const results = await Message.aggregate([
                {
                    $vectorSearch: {
                        index: 'message_vector_index',
                        path: 'embedding',
                        queryVector: queryEmbedding,
                        numCandidates: 50,
                        limit: 6,
                        filter: { userId: userId.toString() }
                    }
                },
                {
                    $match: { _id: { $nin: excludeIds } }
                },
                {
                    $project: { text: 1, role: 1, score: { $meta: 'vectorSearchScore' } }
                }
            ]);

            if (results.length > 0) {
                return results
                    .filter(m => m.score > 0.5)
                    .map(({ text, role }) => ({ text, role }));
            }
        } catch (atlasErr) {
            // Atlas Vector Search not available, fall through to cosine fallback
        }

        // Fallback: in-memory cosine similarity
        const messages = await Message.find({
            userId,
            embedding: { $exists: true, $ne: [] },
            _id: { $nin: excludeIds }
        }).sort({ createdAt: -1 }).limit(100).lean();

        if (messages.length === 0) return [];

        const scored = messages
            .map(m => ({
                ...m,
                score: cosineSimilarity(queryEmbedding, m.embedding)
            }))
            .sort((a, b) => b.score - a.score)
            .filter(m => m.score > 0.5)
            .slice(0, 6);

        return scored.map(({ text, role }) => ({ text, role }));
    } catch (err) {
        console.error('RAG retrieval error:', err.message);
        return [];
    }
}

function cosineSimilarity(a, b) {
    if (!a || !b || a.length !== b.length) return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// GET /api/chat — fetch message history
router.get('/', async (req, res) => {
    try {
        const messages = await Message.find({ userId: req.user._id })
            .sort({ createdAt: 1 })
            .select('-embedding');
        res.json(messages);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// DELETE /api/chat — clear chat history
router.delete('/', async (req, res) => {
    try {
        await Message.deleteMany({ userId: req.user._id });
        res.json({ message: 'Chat history cleared' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /api/chat — send a message and get a Gemini response with RAG
router.post('/', async (req, res) => {
    const { text } = req.body;
    const userId = req.user._id;

    if (!text) {
        return res.status(400).json({ message: 'text is required' });
    }

    try {
        // 1. Save user message
        const userMessage = new Message({ userId, text, role: 'user' });
        await userMessage.save();

        // 2. Fetch recent history (last 20 messages for direct context window)
        const history = await Message.find({ userId })
            .sort({ createdAt: -1 })
            .limit(21)
            .select('-embedding')
            .then(msgs => msgs.reverse());

        const priorHistory = history.slice(0, -1);

        // 3. RAG: retrieve semantically relevant past messages beyond the 20-message window
        const recentIds = history.map(m => m._id);
        const ragContext = await retrieveRelevantHistory(userId, text, recentIds);

        // 4. Build Gemini chat history format
        const geminiHistory = priorHistory.map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.text }],
        }));

        // 5. Gather financial context and build system prompt with RAG context
        const context = await getUserContext(userId);
        const systemPrompt = buildSystemPrompt(context, ragContext);

        // 6. Call Gemini
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            systemInstruction: systemPrompt,
        });

        const chat = model.startChat({ history: geminiHistory });
        const result = await chat.sendMessage(text);
        const responseText = result.response.text();

        // 7. Save AI response
        const aiMessage = new Message({ userId, text: responseText, role: 'assistant' });
        await aiMessage.save();

        res.json(aiMessage);

        // 8. Fire-and-forget: embed both messages for future RAG retrieval
        generateEmbedding(buildMessageText(userMessage)).then(emb => {
            if (emb) Message.findByIdAndUpdate(userMessage._id, { embedding: emb }).catch(() => {});
        });
        generateEmbedding(buildMessageText(aiMessage)).then(emb => {
            if (emb) Message.findByIdAndUpdate(aiMessage._id, { embedding: emb }).catch(() => {});
        });
    } catch (err) {
        console.error('Gemini chat error:', err);

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
