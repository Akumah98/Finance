const Transaction = require('../models/Transaction');
const Category = require('../models/Category');
const User = require('../models/User');
const { generateWithFallback } = require('./aiProvider');
const { sendPushNotification } = require('./notificationService');

const SIX_HOURS = 6 * 60 * 60 * 1000;

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

function clusterTransactions(transactions, threshold = 0.75) {
    const clusters = [];
    for (const tx of transactions) {
        let assigned = false;
        for (const cluster of clusters) {
            const sim = cosineSimilarity(tx.embedding, cluster.representative.embedding);
            if (sim >= threshold) {
                cluster.members.push(tx);
                assigned = true;
                break;
            }
        }
        if (!assigned) {
            clusters.push({ representative: tx, members: [tx] });
        }
    }
    return clusters;
}

function buildPrompt(clusters, categories) {
    const expenseCategories = categories
        .filter(c => c.type === 'expense')
        .map(c => c.name)
        .join(', ');
    const incomeCategories = categories
        .filter(c => c.type === 'income')
        .map(c => c.name)
        .join(', ');

    const groupLines = clusters.map((cluster, i) => {
        const rep = cluster.representative;
        const avgAmount = Math.round(
            cluster.members.reduce((sum, m) => sum + m.amount, 0) / cluster.members.length
        );
        return `${i + 1}. [${rep.type}] "${rep.note}" (avg ${avgAmount} FCFA, ${cluster.members.length} transactions)`;
    }).join('\n');

    return `You are a financial transaction categorizer.

AVAILABLE CATEGORIES (expense): ${expenseCategories || 'None'}
AVAILABLE CATEGORIES (income): ${incomeCategories || 'None'}

Each group below contains similar transactions. For each group:
1. Pick the BEST existing category from the lists above (matching the type)
2. If the existing categories don't fit well, ALSO suggest a better new category name (1-2 words, title case)
3. If an existing category fits perfectly, set "new" to null

GROUPS TO CATEGORIZE:
${groupLines}

Respond ONLY with a JSON array, no markdown, no explanation:
[{"group":1,"existing":"CategoryName","new":"NewName or null"},{"group":2,"existing":"CategoryName","new":null}]`;
}

function parseResponse(text) {
    let cleaned = text.trim();
    if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    try {
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed)) return parsed;
    } catch {}

    const match = cleaned.match(/\[[\s\S]*\]/);
    if (match) {
        try {
            return JSON.parse(match[0]);
        } catch {}
    }

    return null;
}

async function categorizeUserTransactions(userId) {
    const categories = await Category.find({ userId });
    if (categories.length === 0) return { updated: 0, newCategories: [] };

    const transactions = await Transaction.find({
        userId,
        embedding: { $exists: true, $ne: [] },
        categorizationAttempted: { $ne: true }
    }).sort({ date: -1 }).limit(200).lean();

    if (transactions.length === 0) return { updated: 0, newCategories: [] };

    const clusters = clusterTransactions(transactions);
    const prompt = buildPrompt(clusters, categories);

    const { text: responseText } = await generateWithFallback(prompt);
    const results = parseResponse(responseText);

    if (!results) {
        console.error(`Categorization: failed to parse LLM response for user ${userId}`);
        await Transaction.updateMany(
            { _id: { $in: transactions.map(t => t._id) } },
            { $set: { categorizationAttempted: true } }
        );
        return { updated: 0, newCategories: [] };
    }

    const existingNames = new Set(categories.map(c => c.name.toLowerCase()));
    const newCategories = [];
    const bulkOps = [];

    for (const result of results) {
        const groupIndex = result.group - 1;
        if (groupIndex < 0 || groupIndex >= clusters.length) continue;

        const cluster = clusters[groupIndex];
        const existingCategory = result.existing;
        const newCategory = result.new;

        if (!existingCategory) continue;

        for (const tx of cluster.members) {
            const ops = {
                updateOne: {
                    filter: { _id: tx._id },
                    update: {
                        $set: {
                            suggestedCategory: existingCategory,
                            suggestedNewCategory: newCategory || null,
                            categorizationAttempted: true
                        }
                    }
                }
            };
            bulkOps.push(ops);
        }

        if (newCategory && !existingNames.has(newCategory.toLowerCase())) {
            existingNames.add(newCategory.toLowerCase());
            newCategories.push(newCategory);
        }
    }

    // Mark any transactions not in results as attempted (no suggestion)
    const handledIds = new Set(bulkOps.map(op => op.updateOne.filter._id.toString()));
    const unhandled = transactions.filter(t => !handledIds.has(t._id.toString()));
    for (const tx of unhandled) {
        bulkOps.push({
            updateOne: {
                filter: { _id: tx._id },
                update: { $set: { categorizationAttempted: true } }
            }
        });
    }

    if (bulkOps.length > 0) {
        await Transaction.bulkWrite(bulkOps);
    }

    return { updated: bulkOps.length - unhandled.length, newCategories };
}

async function runCategorizationJob() {
    try {
        const userIds = await Transaction.distinct('userId', {
            embedding: { $exists: true, $ne: [] },
            categorizationAttempted: { $ne: true }
        });

        if (userIds.length === 0) {
            console.log('Categorization job: no users with uncategorized transactions');
            return;
        }

        console.log(`Categorization job: processing ${userIds.length} user(s)`);
        let totalUpdated = 0;
        let totalNewCategories = 0;

        for (const userId of userIds) {
            try {
                const result = await categorizeUserTransactions(userId);
                totalUpdated += result.updated;
                totalNewCategories += result.newCategories.length;

                if (result.updated > 0) {
                    const user = await User.findById(userId).select('pushToken').lean();
                    if (user && user.pushToken) {
                        await sendPushNotification(
                            user.pushToken,
                            'Category Suggestions Ready',
                            `AI has ${result.updated} category suggestion${result.updated > 1 ? 's' : ''} for your transactions. Tap to review.`
                        );
                    }
                }
            } catch (err) {
                console.error(`Categorization failed for user ${userId}:`, err.message);
            }

            // 2-second delay between users to respect LLM rate limits
            if (userIds.indexOf(userId) < userIds.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        console.log(`Categorization job done: ${totalUpdated} suggestions for ${userIds.length} users, ${totalNewCategories} new category names`);
    } catch (err) {
        console.error('Categorization job error:', err.message);
    }
}

function startCategorizationScheduler() {
    setInterval(runCategorizationJob, SIX_HOURS);
    setTimeout(runCategorizationJob, 60000);
    console.log('Categorization scheduler started (6-hour interval)');
}

module.exports = { startCategorizationScheduler, categorizeUserTransactions };
