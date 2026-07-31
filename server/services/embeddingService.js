const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const EMBEDDING_MODEL = 'text-embedding-004';
const DIMENSIONS = 768;

async function generateEmbedding(text) {
    if (!text || text.trim().length === 0) return null;

    try {
        const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
        const result = await model.embedContent(text.trim());
        return result.embedding.values;
    } catch (err) {
        console.error('Embedding generation failed:', err.message);
        return null;
    }
}

async function generateEmbeddings(texts) {
    if (!texts || texts.length === 0) return [];

    try {
        const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
        const result = await model.batchEmbedContents(
            texts.map(text => ({ content: { parts: [{ text: text.trim() }] } }))
        );
        return result.embeddings.map(e => e.values);
    } catch (err) {
        console.error('Batch embedding failed:', err.message);
        return texts.map(() => null);
    }
}

function buildTransactionText(transaction) {
    const parts = [];
    if (transaction.type) parts.push(transaction.type);
    if (transaction.category) parts.push(transaction.category);
    if (transaction.note) parts.push(transaction.note);
    if (transaction.amount) parts.push(`${transaction.amount}`);
    return parts.join(' | ');
}

function buildMessageText(message) {
    return message.text || '';
}

module.exports = {
    generateEmbedding,
    generateEmbeddings,
    buildTransactionText,
    buildMessageText,
    DIMENSIONS,
};
