const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const Category = require('../models/Category');
const { protect } = require('../middleware/authMiddleware');
const { generateEmbedding, generateEmbeddings, buildTransactionText } = require('../services/embeddingService');
const { generateWithFallback } = require('../services/aiProvider');
const insightsCache = require('../services/insightsCache');
const { categorizeUserTransactions } = require('../services/categorizationJob');

// Apply protection to all routes
router.use(protect);

// Get transactions for the authenticated user (with pagination and date filtering)
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        const filter = { userId: req.user.id };

        if (req.query.startDate || req.query.endDate) {
            filter.date = {};
            if (req.query.startDate) filter.date.$gte = new Date(req.query.startDate);
            if (req.query.endDate) filter.date.$lte = new Date(req.query.endDate);
        }

        if (req.query.type) {
            filter.type = req.query.type;
        }

        if (req.query.category) {
            filter.category = req.query.category;
        }

        const [transactions, total] = await Promise.all([
            Transaction.find(filter).sort({ date: -1 }).skip(skip).limit(limit),
            Transaction.countDocuments(filter)
        ]);

        res.json({
            transactions,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Add a new transaction
router.post('/', async (req, res) => {
    const { type, amount, category, date, note, receiptUri } = req.body;

    if (!note || !note.trim()) {
        return res.status(400).json({ message: 'A note is required for every transaction' });
    }

    try {
        const newTransaction = new Transaction({
            userId: req.user.id,
            type,
            amount,
            category,
            date,
            note,
            receiptUri
        });

        // Generate embedding asynchronously (don't block response)
        const savedTransaction = await newTransaction.save();
        insightsCache.invalidate(req.user.id);
        res.status(201).json(savedTransaction);

        // Fire-and-forget embedding & AI category suggestion for review screen
        const text = buildTransactionText(savedTransaction);
        generateEmbedding(text).then(async (embedding) => {
            const updates = {};
            if (embedding) updates.embedding = embedding;

            if (savedTransaction.category === 'Other' || !savedTransaction.suggestedCategory) {
                const suggestion = await suggestCategoryHelper(
                    savedTransaction.userId,
                    savedTransaction.note,
                    null,
                    savedTransaction.type
                );
                if (suggestion?.category && suggestion.category !== savedTransaction.category) {
                    updates.suggestedCategory = suggestion.category;
                }
            }

            if (Object.keys(updates).length > 0) {
                await Transaction.findByIdAndUpdate(savedTransaction._id, updates).catch(() => {});
            }
        });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update a transaction
router.put('/:id', async (req, res) => {
    try {
        console.log('UPDATE transaction called:', { id: req.params.id, body: req.body });

        const transaction = await Transaction.findById(req.params.id);

        if (!transaction) {
            console.log('Transaction not found:', req.params.id);
            return res.status(404).json({ message: 'Transaction not found' });
        }

        // Make sure user owns the transaction
        if (transaction.userId.toString() !== req.user.id) {
            return res.status(401).json({ message: 'User not authorized' });
        }

        const updatedTransaction = await Transaction.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        insightsCache.invalidate(req.user.id);
        res.json(updatedTransaction);

        // Re-generate embedding for updated content
        const text = buildTransactionText(updatedTransaction);
        generateEmbedding(text).then(embedding => {
            if (embedding) {
                Transaction.findByIdAndUpdate(updatedTransaction._id, { embedding }).catch(() => {});
            }
        });
    } catch (err) {
        console.error('UPDATE transaction error:', err.message);
        res.status(400).json({ message: err.message });
    }
});

// Delete a transaction
router.delete('/:id', async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id);

        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        // Make sure user owns the transaction
        if (transaction.userId.toString() !== req.user.id) {
            return res.status(401).json({ message: 'User not authorized' });
        }

        await Transaction.findByIdAndDelete(req.params.id);
        insightsCache.invalidate(req.user.id);
        res.json({ message: 'Transaction deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Add multiple transactions (Bulk)
router.post('/bulk', async (req, res) => {
    const transactions = req.body;

    if (!Array.isArray(transactions) || transactions.length === 0) {
        return res.status(400).json({ message: 'No transactions provided' });
    }

    const missingNotes = transactions.filter(t => !t.note || !t.note.trim());
    if (missingNotes.length > 0) {
        return res.status(400).json({ message: 'All transactions must have a note' });
    }

    try {
        const transactionsToSave = transactions.map(t => ({
            ...t,
            userId: req.user.id,
            date: t.date || new Date(),
            type: t.type || 'expense',
            amount: t.amount,
            category: t.category || 'Other',
            note: t.note,
            receiptUri: t.receiptUri
        }));

        const savedTransactions = await Transaction.insertMany(transactionsToSave);
        res.status(201).json(savedTransactions);

        // Fire-and-forget: generate embeddings for all saved transactions
        const texts = savedTransactions.map(t => buildTransactionText(t));
        generateEmbeddings(texts).then(embeddings => {
            const ops = savedTransactions
                .map((t, i) => embeddings[i] ? {
                    updateOne: { filter: { _id: t._id }, update: { embedding: embeddings[i] } }
                } : null)
                .filter(Boolean);
            if (ops.length > 0) Transaction.bulkWrite(ops).catch(() => {});
        });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Semantic search transactions
router.post('/search', async (req, res) => {
    const { query } = req.body;

    if (!query) {
        return res.status(400).json({ message: 'query is required' });
    }

    try {
        const queryEmbedding = await generateEmbedding(query);

        if (!queryEmbedding) {
            return res.status(500).json({ message: 'Failed to generate search embedding' });
        }

        // Use MongoDB Atlas Vector Search if available, fall back to in-memory cosine
        let results;
        try {
            results = await Transaction.aggregate([
                {
                    $vectorSearch: {
                        index: 'transaction_vector_index',
                        path: 'embedding',
                        queryVector: queryEmbedding,
                        numCandidates: 100,
                        limit: 10,
                        filter: { userId: req.user._id }
                    }
                },
                { $project: { embedding: 0 } }
            ]);
        } catch (vectorErr) {
            // Fallback: fetch recent transactions with embeddings and compute cosine similarity in-memory
            const transactions = await Transaction.find({
                userId: req.user.id,
                embedding: { $exists: true, $ne: [] }
            }).sort({ date: -1 }).limit(200).lean();

            results = transactions
                .map(t => ({
                    ...t,
                    score: cosineSimilarity(queryEmbedding, t.embedding)
                }))
                .sort((a, b) => b.score - a.score)
                .slice(0, 10)
                .map(({ embedding, ...rest }) => rest);
        }

        res.json(results);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

async function suggestCategoryHelper(userId, note, merchant, type = 'expense') {
    const text = [note, merchant].filter(Boolean).join(' ');
    if (!text || !text.trim()) return null;

    const userCategories = await Category.find({ userId });
    const matchingCategories = userCategories.filter(c => c.type === type);
    const categoryNames = matchingCategories.length > 0
        ? matchingCategories.map(c => c.name)
        : (type === 'income' ? ['Salary', 'Freelance', 'Gift', 'Savings', 'Other'] : ['Food', 'Transport', 'Shopping', 'Health', 'Bills', 'Entertainment', 'Education', 'Savings', 'Other']);

    // Tier 0: Exact Past Note Match (0 Tokens, 0 AI Calls)
    try {
        const exactMatch = await Transaction.findOne({
            userId,
            type,
            note: { $regex: new RegExp(`^${text.trim()}$`, 'i') }
        }).sort({ date: -1 }).lean();

        if (exactMatch && categoryNames.includes(exactMatch.category)) {
            return {
                category: exactMatch.category,
                confidence: 0.98,
                method: 'exact_history'
            };
        }
    } catch (e) {
        console.error('Exact history match failed:', e.message);
    }

    // Tier 1: Vector Embedding Cosine Similarity match
    try {
        const queryEmbedding = await generateEmbedding(text);
        if (queryEmbedding) {
            const pastTxns = await Transaction.find({
                userId,
                type,
                embedding: { $exists: true, $ne: [] }
            }).sort({ date: -1 }).limit(100).lean();

            if (pastTxns.length > 0) {
                const scored = pastTxns
                    .map(t => ({ category: t.category, score: cosineSimilarity(queryEmbedding, t.embedding) }))
                    .sort((a, b) => b.score - a.score)
                    .filter(item => categoryNames.includes(item.category));

                if (scored.length > 0 && scored[0].score >= 0.55) {
                    return {
                        category: scored[0].category,
                        confidence: parseFloat(scored[0].score.toFixed(2)),
                        method: 'vector'
                    };
                }
            }
        }
    } catch (e) {
        console.error('Vector similarity suggestion failed:', e.message);
    }

    // Tier 2: AI Zero-Shot Classification Fallback
    try {
        const prompt = `You are a financial transaction categorizer.
Task: Pick the single best fitting category for the transaction below.

TRANSACTION NOTE: "${text}"
TRANSACTION TYPE: "${type}"
AVAILABLE CATEGORIES: ${categoryNames.join(', ')}

Respond ONLY with a JSON object: {"category": "CategoryName"} and no markdown or extra text.`;

        const { text: responseText } = await generateWithFallback(prompt);
        let cleaned = responseText.trim();
        if (cleaned.startsWith('```')) {
            cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        }
        const parsed = JSON.parse(cleaned);
        if (parsed?.category && categoryNames.includes(parsed.category)) {
            return {
                category: parsed.category,
                confidence: 0.85,
                method: 'ai'
            };
        }
    } catch (e) {
        console.error('AI zero-shot suggestion failed:', e.message);
    }

    // Tier 3: Safe Fallback
    const fallbackCategory = categoryNames.includes('Other') ? 'Other' : categoryNames[0];
    return {
        category: fallbackCategory,
        confidence: 0.50,
        method: 'fallback'
    };
}

// Auto-categorize a transaction based on semantic similarity + AI fallback
router.post('/suggest-category', async (req, res) => {
    const { note, merchant, type } = req.body;

    if (!note && !merchant) {
        return res.status(400).json({ message: 'note or merchant is required' });
    }

    try {
        const result = await suggestCategoryHelper(req.user.id, note, merchant, type || 'expense');
        res.json({
            category: result ? result.category : null,
            confidence: result ? result.confidence : 0,
            method: result ? result.method : 'none'
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/transactions/month-comparison — compare current vs previous month spending
router.get('/month-comparison', async (req, res) => {
    try {
        const now = new Date();
        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

        const [thisMonth, lastMonth] = await Promise.all([
            Transaction.find({ userId: req.user.id, type: 'expense', date: { $gte: startOfThisMonth } }).lean(),
            Transaction.find({ userId: req.user.id, type: 'expense', date: { $gte: startOfLastMonth, $lte: endOfLastMonth } }).lean()
        ]);

        const sumByCategory = (txs) => {
            const map = {};
            for (const tx of txs) {
                map[tx.category] = (map[tx.category] || 0) + tx.amount;
            }
            return map;
        };

        const thisMonthCats = sumByCategory(thisMonth);
        const lastMonthCats = sumByCategory(lastMonth);

        const allCategories = [...new Set([...Object.keys(thisMonthCats), ...Object.keys(lastMonthCats)])];

        const comparison = allCategories.map(category => {
            const current = thisMonthCats[category] || 0;
            const previous = lastMonthCats[category] || 0;
            const change = previous > 0 ? Math.round(((current - previous) / previous) * 100) : (current > 0 ? 100 : 0);
            return { category, current: Math.round(current), previous: Math.round(previous), changePercent: change };
        }).sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));

        const totalThis = thisMonth.reduce((s, t) => s + t.amount, 0);
        const totalLast = lastMonth.reduce((s, t) => s + t.amount, 0);
        const totalChange = totalLast > 0 ? Math.round(((totalThis - totalLast) / totalLast) * 100) : 0;

        res.json({
            comparison,
            totals: { current: Math.round(totalThis), previous: Math.round(totalLast), changePercent: totalChange }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/transactions/subscriptions — detect recurring transaction patterns
router.get('/subscriptions', async (req, res) => {
    try {
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        const transactions = await Transaction.find({
            userId: req.user.id,
            type: 'expense',
            date: { $gte: threeMonthsAgo }
        }).sort({ date: -1 }).lean();

        // Group by normalized note (lowercase, trimmed)
        const groups = {};
        for (const tx of transactions) {
            const key = (tx.note || '').toLowerCase().trim();
            if (!key || key.length < 3) continue;
            if (!groups[key]) groups[key] = [];
            groups[key].push(tx);
        }

        const subscriptions = [];

        for (const [note, txs] of Object.entries(groups)) {
            if (txs.length < 2) continue;

            // Check if amounts are similar (within 20% of each other)
            const amounts = txs.map(t => t.amount);
            const avgAmount = amounts.reduce((s, a) => s + a, 0) / amounts.length;
            const allSimilar = amounts.every(a => Math.abs(a - avgAmount) / avgAmount < 0.2);
            if (!allSimilar) continue;

            // Check frequency: are dates roughly evenly spaced?
            const dates = txs.map(t => new Date(t.date).getTime()).sort((a, b) => a - b);
            if (dates.length < 2) continue;

            const gaps = [];
            for (let i = 1; i < dates.length; i++) {
                gaps.push((dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24));
            }
            const avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;

            // Detect frequency
            let frequency = null;
            if (avgGap >= 25 && avgGap <= 35) frequency = 'monthly';
            else if (avgGap >= 6 && avgGap <= 8) frequency = 'weekly';
            else if (avgGap >= 13 && avgGap <= 16) frequency = 'biweekly';
            else continue; // not a recognizable pattern

            subscriptions.push({
                note: txs[0].note,
                category: txs[0].category,
                avgAmount: Math.round(avgAmount),
                frequency,
                occurrences: txs.length,
                lastDate: txs[0].date,
                monthlyEstimate: frequency === 'weekly' ? Math.round(avgAmount * 4.3)
                    : frequency === 'biweekly' ? Math.round(avgAmount * 2)
                    : Math.round(avgAmount)
            });
        }

        // Sort by monthly cost descending
        subscriptions.sort((a, b) => b.monthlyEstimate - a.monthlyEstimate);

        const totalMonthly = subscriptions.reduce((s, sub) => s + sub.monthlyEstimate, 0);

        res.json({ subscriptions, totalMonthly });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

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

// GET /api/transactions/suggestions — get pending AI category suggestions
router.get('/suggestions', async (req, res) => {
    try {
        const suggestions = await Transaction.find({
            userId: req.user.id,
            suggestedCategory: { $ne: null }
        })
            .select('_id type amount note category suggestedCategory suggestedNewCategory date')
            .sort({ date: -1 });

        res.json(suggestions);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /api/transactions/suggestions/accept — accept suggestions
router.post('/suggestions/accept', async (req, res) => {
    const { transactionIds, useNew, all } = req.body;

    try {
        let filter = { userId: req.user.id, suggestedCategory: { $ne: null } };
        if (!all && transactionIds) {
            filter._id = { $in: transactionIds };
        }

        const transactions = await Transaction.find(filter).lean();
        if (transactions.length === 0) {
            return res.json({ updated: 0, newCategories: [] });
        }

        const userCategories = await Category.find({ userId: req.user.id });
        const existingNames = new Set(userCategories.map(c => c.name.toLowerCase()));
        const newCategoryNames = [];
        const bulkOps = [];

        for (const tx of transactions) {
            const chosenCategory = useNew && tx.suggestedNewCategory
                ? tx.suggestedNewCategory
                : tx.suggestedCategory;

            if (!chosenCategory || chosenCategory === 'Other') continue;

            if (!existingNames.has(chosenCategory.toLowerCase())) {
                existingNames.add(chosenCategory.toLowerCase());
                newCategoryNames.push({ name: chosenCategory, type: tx.type });
            }

            bulkOps.push({
                updateOne: {
                    filter: { _id: tx._id },
                    update: {
                        $set: { category: chosenCategory, suggestedCategory: null, suggestedNewCategory: null }
                    }
                }
            });
        }

        // Create new categories
        if (newCategoryNames.length > 0) {
            const newCats = newCategoryNames.map(c => ({
                userId: req.user.id,
                name: c.name,
                icon: 'shape',
                color: c.type === 'income' ? '#10B981' : '#3B82F6',
                type: c.type
            }));
            await Category.insertMany(newCats);
        }

        if (bulkOps.length > 0) {
            await Transaction.bulkWrite(bulkOps);
        }

        insightsCache.invalidate(req.user.id);

        res.json({
            updated: bulkOps.length,
            newCategories: newCategoryNames.map(c => c.name)
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /api/transactions/suggestions/reject — reject suggestions
router.post('/suggestions/reject', async (req, res) => {
    const { transactionIds, all } = req.body;

    try {
        let filter = { userId: req.user.id, suggestedCategory: { $ne: null } };
        if (!all && transactionIds) {
            filter._id = { $in: transactionIds };
        }

        await Transaction.updateMany(filter, {
            $set: { suggestedCategory: null, suggestedNewCategory: null }
        });

        res.json({ message: 'Suggestions rejected' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /api/transactions/batch-categorize — manual trigger for categorization
const batchCategorizeTimestamps = new Map();
const BATCH_COOLDOWN_MS = 10 * 60 * 1000;

router.post('/batch-categorize', async (req, res) => {
    const userId = req.user.id;
    const lastRun = batchCategorizeTimestamps.get(userId);

    if (lastRun && Date.now() - lastRun < BATCH_COOLDOWN_MS) {
        const waitMin = Math.ceil((BATCH_COOLDOWN_MS - (Date.now() - lastRun)) / 60000);
        return res.status(429).json({ message: `Please wait ${waitMin} minute(s) before trying again.` });
    }

    try {
        batchCategorizeTimestamps.set(userId, Date.now());
        const result = await categorizeUserTransactions(userId);
        res.json(result);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
