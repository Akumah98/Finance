const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const { protect } = require('../middleware/authMiddleware');
const { generateEmbedding, generateEmbeddings, buildTransactionText } = require('../services/embeddingService');
const insightsCache = require('../services/insightsCache');

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

        // Fire-and-forget embedding generation
        const text = buildTransactionText(savedTransaction);
        generateEmbedding(text).then(embedding => {
            if (embedding) {
                Transaction.findByIdAndUpdate(savedTransaction._id, { embedding }).catch(() => {});
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

    try {
        // Ensure security by forcing userId from token
        const transactionsToSave = transactions.map(t => ({
            ...t,
            userId: req.user.id,
            // Ensure essential fields are present if not handled by schema defaults (though schema handles most)
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

// Auto-categorize a transaction based on semantic similarity
router.post('/suggest-category', async (req, res) => {
    const { note, merchant } = req.body;

    if (!note && !merchant) {
        return res.status(400).json({ message: 'note or merchant is required' });
    }

    try {
        const text = [note, merchant].filter(Boolean).join(' ');
        const queryEmbedding = await generateEmbedding(text);

        if (!queryEmbedding) {
            return res.json({ category: null });
        }

        // Find similar past transactions
        const transactions = await Transaction.find({
            userId: req.user.id,
            embedding: { $exists: true, $ne: [] }
        }).sort({ date: -1 }).limit(100).lean();

        if (transactions.length === 0) {
            return res.json({ category: null });
        }

        const scored = transactions
            .map(t => ({ category: t.category, score: cosineSimilarity(queryEmbedding, t.embedding) }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);

        // Vote: most common category among top 5 similar transactions
        const categoryCount = {};
        for (const { category, score } of scored) {
            if (score > 0.6) {
                categoryCount[category] = (categoryCount[category] || 0) + 1;
            }
        }

        const topCategory = Object.entries(categoryCount)
            .sort(([, a], [, b]) => b - a)[0];

        res.json({
            category: topCategory ? topCategory[0] : null,
            confidence: topCategory ? scored[0].score : 0,
            alternatives: scored.slice(0, 3).map(s => s.category)
        });
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

module.exports = router;
