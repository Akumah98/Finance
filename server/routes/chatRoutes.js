const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Transaction = require('../models/Transaction');
const Bill = require('../models/Bill');
const SavingsGoal = require('../models/SavingsGoal');
const Budget = require('../models/Budget');
const MoneyPlan = require('../models/MoneyPlan');
const { protect } = require('../middleware/authMiddleware');
const { generateEmbedding, buildMessageText } = require('../services/embeddingService');
const { chatWithFallback } = require('../services/aiProvider');

router.use(protect);

// Per-user rate limiter: max 30 messages per hour to protect LLM quota
const userMessageCounts = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 30;

function checkRateLimit(userId) {
    const key = userId.toString();
    const now = Date.now();
    const entry = userMessageCounts.get(key);

    if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
        userMessageCounts.set(key, { windowStart: now, count: 1 });
        return true;
    }

    if (entry.count >= RATE_LIMIT_MAX) {
        return false;
    }

    entry.count++;
    return true;
}

const buildSystemPrompt = (context, ragContext, ragTransactions = []) => {
    const { income, expenses, savingsRate, topCategories, budgetStatus, overdueBills, goals, plan, recentTransactions = [] } = context;

    let ragSection = '';
    if (ragContext && ragContext.length > 0) {
        ragSection += `\n\n=== RELEVANT PAST CONVERSATIONS ===\n${ragContext.map(m => `[${m.role}]: ${m.text}`).join('\n')}\n=== END PAST CONVERSATIONS ===\n`;
    }

    let transactionRagSection = '';
    if (ragTransactions && ragTransactions.length > 0) {
        transactionRagSection += `\n\n=== RELEVANT TRANSACTIONS (FOUND VIA SEMANTIC SEARCH) ===\n${ragTransactions.map(t => `  - Date: ${new Date(t.date).toLocaleDateString()} | Type: ${t.type} | Category: ${t.category} | Amount: ${t.amount} FCFA | Note: "${t.note || 'No note'}"${t.merchant ? ` | Merchant: "${t.merchant}"` : ''}`).join('\n')}\n=== END RELEVANT TRANSACTIONS ===\n`;
    }

    const recentTxList = recentTransactions.length > 0
        ? recentTransactions.map(t => `  - ${new Date(t.date).toLocaleDateString()} [${t.type.toUpperCase()}] ${t.category}: ${t.amount} FCFA — Note: "${t.note || 'No note'}"${t.merchant ? ` (${t.merchant})` : ''}`).join('\n')
        : '  No recent transactions logged';

    return `You are Glitch Assistant, a friendly and knowledgeable personal finance coach inside the Glitch app.
You have access to the user's real financial data, individual transactions, and transaction notes.
Note: All monetary values in this app are in FCFA (Central African CFA Franc, XAF). When discussing monetary amounts, always format them in FCFA (e.g., 10,000 FCFA).
Never make up numbers or details — only reference the data provided below.
Keep responses concise (2–4 sentences max unless the user asks for detail).
Be encouraging but honest. If something looks bad, say so clearly but constructively.

=== USER'S FINANCIAL SNAPSHOT (THIS MONTH) ===
Total income logged: ${income.toFixed(0)} FCFA
Total expenses: ${expenses.toFixed(0)} FCFA
Savings rate: ${savingsRate.toFixed(1)}% (target: 20%)

Allocation plan: ${plan ? `Needs ${plan.needsPct}% / Wants ${plan.wantsPct}% / Future ${plan.futurePct}%` : 'Not set up yet'}

Top spending categories:
${topCategories.length > 0
        ? topCategories.map(c => `  - ${c.category}: ${c.amount.toFixed(2)} FCFA ${c.overBudget ? '(OVER BUDGET)' : ''}`).join('\n')
        : '  No expenses logged yet'}

Budget status:
${budgetStatus.length > 0
        ? budgetStatus.map(b => `  - ${b.category}: spent ${b.spent.toFixed(2)} FCFA of ${b.budget.toFixed(2)} FCFA (${b.pct.toFixed(0)}%)`).join('\n')
        : '  No budgets set'}

Overdue unpaid bills:
${overdueBills.length > 0
        ? overdueBills.map(b => `  - ${b.name}: ${b.amount.toFixed(2)} FCFA (due ${new Date(b.dueDate).toLocaleDateString()})`).join('\n')
        : '  None — great!'}

Savings goals:
${goals.length > 0
        ? goals.map(g => `  - ${g.name}: ${g.currentAmount.toFixed(2)} FCFA / ${g.targetAmount.toFixed(2)} FCFA (${Math.round((g.currentAmount / g.targetAmount) * 100)}%)`).join('\n')
        : '  No savings goals set'}

=== RECENT TRANSACTIONS & NOTES ===
${recentTxList}
=== END OF SNAPSHOT ===${transactionRagSection}${ragSection}

Answer the user's question using this transaction data and notes. If they ask where they spent money or what a transaction was for, refer directly to the notes and transaction details above. If they ask something unrelated to personal finance, politely redirect them.`;
};

const getUserContext = async (userId) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const [transactions, bills, goals, budgets, plan, recentTransactions] = await Promise.all([
        Transaction.find({ userId, date: { $gte: startOfMonth, $lte: endOfMonth } }),
        Bill.find({ userId }),
        SavingsGoal.find({ userId }),
        Budget.find({ userId }),
        MoneyPlan.findOne({ userId }),
        Transaction.find({ userId }).sort({ date: -1 }).limit(25).lean(),
    ]);

    const income = transactions
        .filter(t => t.type === 'income')
        .reduce((s, t) => s + t.amount, 0);

    const expenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((s, t) => s + t.amount, 0);

    const savingsExpense = transactions
        .filter(t => t.type === 'expense' && t.category === 'Savings')
        .reduce((s, t) => s + t.amount, 0);

    const savingsIncome = transactions
        .filter(t => t.type === 'income' && t.category === 'Savings')
        .reduce((s, t) => s + t.amount, 0);

    const savedAmount = savingsExpense - savingsIncome;
    const regularIncome = Math.max(income - savingsIncome, 0);

    const savingsRate = regularIncome > 0 ? (Math.max(savedAmount, 0) / regularIncome) * 100 : 0;

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

    return { income, expenses, savingsRate, topCategories, budgetStatus, overdueBills, goals, plan, recentTransactions };
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

        // Fallback: in-memory cosine similarity (reduced from 100 to 50)
        const messages = await Message.find({
            userId,
            embedding: { $exists: true, $ne: [] },
            _id: { $nin: excludeIds }
        }).sort({ createdAt: -1 }).limit(50).lean();

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

// RAG: retrieve semantically similar transactions via vector search
async function retrieveRelevantTransactions(userId, queryText) {
    try {
        const queryEmbedding = await generateEmbedding(queryText);
        if (!queryEmbedding) return [];

        // Try Atlas Vector Search first
        try {
            const results = await Transaction.aggregate([
                {
                    $vectorSearch: {
                        index: 'transaction_vector_index',
                        path: 'embedding',
                        queryVector: queryEmbedding,
                        numCandidates: 50,
                        limit: 8,
                        filter: { userId: userId.toString() }
                    }
                },
                {
                    $project: { type: 1, amount: 1, category: 1, date: 1, note: 1, merchant: 1, score: { $meta: 'vectorSearchScore' } }
                }
            ]);

            if (results.length > 0) {
                return results.filter(t => t.score > 0.35);
            }
        } catch (atlasErr) {
            // Atlas Vector Search not configured or failed, fall through to in-memory cosine fallback
        }

        // Fallback: in-memory cosine similarity search (reduced from 200 to 100)
        const transactions = await Transaction.find({
            userId,
            embedding: { $exists: true, $ne: [] }
        }).sort({ date: -1 }).limit(100).lean();

        if (transactions.length === 0) return [];

        return transactions
            .map(t => ({
                ...t,
                score: cosineSimilarity(queryEmbedding, t.embedding)
            }))
            .sort((a, b) => b.score - a.score)
            .filter(t => t.score > 0.35)
            .slice(0, 8);
    } catch (err) {
        console.error('RAG transaction retrieval error:', err.message);
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

    if (!checkRateLimit(userId)) {
        return res.status(429).json({
            message: "You've reached the message limit (30/hour). Please try again later.",
            role: 'assistant',
            text: "You've sent a lot of messages! To keep things running smoothly, please wait a bit before sending more. Your limit resets every hour."
        });
    }

    try {
        // 1. Save user message
        const userMessage = new Message({ userId, text, role: 'user' });
        await userMessage.save();

        // 2. Fetch recent history (last 12 messages for direct context window — reduced from 20)
        const history = await Message.find({ userId })
            .sort({ createdAt: -1 })
            .limit(13)
            .select('-embedding')
            .then(msgs => msgs.reverse());

        const priorHistory = history.slice(0, -1);

        // 3. RAG: skip for trivial/short messages to save LLM embedding calls
        const isTrivial = text.length < 10 || /^(hi|hey|hello|thanks|thank you|ok|okay|bye|good|great|nice|cool|sure|yes|no|yep|nope)\b/i.test(text.trim());

        let ragContext = [];
        let ragTransactions = [];

        if (!isTrivial) {
            const recentIds = history.map(m => m._id);
            [ragContext, ragTransactions] = await Promise.all([
                retrieveRelevantHistory(userId, text, recentIds),
                retrieveRelevantTransactions(userId, text)
            ]);
        }

        // 4. Build Gemini chat history format
        const geminiHistory = priorHistory.map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.text }],
        }));

        // 5. Gather financial context and build system prompt with RAG context and RAG transactions
        const context = await getUserContext(userId);
        const systemPrompt = buildSystemPrompt(context, ragContext, ragTransactions);

        // 6. Call AI with fallback across providers
        const { text: responseText } = await chatWithFallback(systemPrompt, geminiHistory, text);

        // 7. Save AI response
        const aiMessage = new Message({ userId, text: responseText, role: 'assistant' });
        await aiMessage.save();

        res.json(aiMessage);

        // 8. Fire-and-forget: embed messages for future RAG (skip trivial ones to save API calls)
        if (!isTrivial) {
            generateEmbedding(buildMessageText(userMessage)).then(emb => {
                if (emb) Message.findByIdAndUpdate(userMessage._id, { embedding: emb }).catch(() => {});
            });
            generateEmbedding(buildMessageText(aiMessage)).then(emb => {
                if (emb) Message.findByIdAndUpdate(aiMessage._id, { embedding: emb }).catch(() => {});
            });
        }
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
