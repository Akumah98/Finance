const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const Message = require('../models/Message');
const { protect } = require('../middleware/authMiddleware');
const { generateEmbeddings, buildTransactionText, buildMessageText } = require('../services/embeddingService');

router.use(protect);

// POST /api/embeddings/backfill — generate embeddings for existing data
router.post('/backfill', async (req, res) => {
    const userId = req.user.id;
    const { type = 'transactions', batchSize: rawBatchSize = 20 } = req.body;
    const batchSize = Math.min(Math.max(1, rawBatchSize), 50);

    try {
        let processed = 0;

        if (type === 'transactions' || type === 'all') {
            const transactions = await Transaction.find({
                userId,
                $or: [
                    { embedding: { $exists: false } },
                    { embedding: [] }
                ]
            }).limit(batchSize).lean();

            if (transactions.length > 0) {
                const texts = transactions.map(t => buildTransactionText(t));
                const embeddings = await generateEmbeddings(texts);

                const ops = transactions
                    .map((t, i) => embeddings[i] ? {
                        updateOne: { filter: { _id: t._id }, update: { embedding: embeddings[i] } }
                    } : null)
                    .filter(Boolean);

                if (ops.length > 0) await Transaction.bulkWrite(ops);
                processed += ops.length;
            }
        }

        if (type === 'messages' || type === 'all') {
            const messages = await Message.find({
                userId,
                $or: [
                    { embedding: { $exists: false } },
                    { embedding: [] }
                ]
            }).limit(batchSize).lean();

            if (messages.length > 0) {
                const texts = messages.map(m => buildMessageText(m));
                const embeddings = await generateEmbeddings(texts);

                const ops = messages
                    .map((m, i) => embeddings[i] ? {
                        updateOne: { filter: { _id: m._id }, update: { embedding: embeddings[i] } }
                    } : null)
                    .filter(Boolean);

                if (ops.length > 0) await Message.bulkWrite(ops);
                processed += ops.length;
            }
        }

        // Count remaining
        const remainingTransactions = await Transaction.countDocuments({
            userId,
            $or: [{ embedding: { $exists: false } }, { embedding: [] }]
        });
        const remainingMessages = await Message.countDocuments({
            userId,
            $or: [{ embedding: { $exists: false } }, { embedding: [] }]
        });

        res.json({
            processed,
            remaining: {
                transactions: remainingTransactions,
                messages: remainingMessages
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/embeddings/status — check embedding coverage
router.get('/status', async (req, res) => {
    const userId = req.user.id;

    try {
        const [totalTx, embeddedTx, totalMsg, embeddedMsg] = await Promise.all([
            Transaction.countDocuments({ userId }),
            Transaction.countDocuments({ userId, embedding: { $exists: true, $not: { $size: 0 } } }),
            Message.countDocuments({ userId }),
            Message.countDocuments({ userId, embedding: { $exists: true, $not: { $size: 0 } } }),
        ]);

        res.json({
            transactions: { total: totalTx, embedded: embeddedTx, coverage: totalTx > 0 ? Math.round((embeddedTx / totalTx) * 100) : 0 },
            messages: { total: totalMsg, embedded: embeddedMsg, coverage: totalMsg > 0 ? Math.round((embeddedMsg / totalMsg) * 100) : 0 },
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
