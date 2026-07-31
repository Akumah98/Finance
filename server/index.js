const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.log(err));

// Ensure indexes for query performance
mongoose.connection.once('open', async () => {
    try {
        const db = mongoose.connection.db;
        await db.collection('transactions').createIndex({ userId: 1, date: -1 });
        await db.collection('transactions').createIndex({ userId: 1, type: 1, date: -1 });
        await db.collection('bills').createIndex({ userId: 1, isPaid: 1, dueDate: 1 });
        await db.collection('messages').createIndex({ userId: 1, createdAt: -1 });
        await db.collection('savingsgoals').createIndex({ userId: 1 });
        await db.collection('categories').createIndex({ userId: 1 });
    } catch (err) {
        console.error('Index creation error:', err.message);
    }
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/transactions', require('./routes/transactionRoutes'));
app.use('/api/bills', require('./routes/billRoutes'));
app.use('/api/savings-goals', require('./routes/savingsGoalRoutes'));
app.use('/api/chat', require('./routes/chatRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/insights', require('./routes/insightsRoutes'));
app.use('/api/budgets', require('./routes/budgetRoutes'));
app.use('/api/money-plan', require('./routes/moneyPlanRoutes'));
app.use('/api/health-score', require('./routes/healthScoreRoutes'));
app.use('/api/monthly-review', require('./routes/monthlyReviewRoutes'));
app.use('/api/embeddings', require('./routes/embedRoutes'));
app.use('/api/export', require('./routes/exportRoutes'));

// Routes
app.get('/', (req, res) => {
    res.send('API is running...');
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Backend is connected and healthy!' });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

// Start bill reminder scheduler
const { startBillReminderScheduler } = require('./services/notificationService');
startBillReminderScheduler();

// Health check all AI providers on startup
const { providers } = require('./services/aiProvider');
async function checkProviders() {
    console.log(`\n🔌 AI Providers configured: ${providers.length}`);
    for (const provider of providers) {
        try {
            await provider.generate('Say "ok" and nothing else.');
            console.log(`  ✅ ${provider.name} — connected`);
        } catch (err) {
            console.log(`  ❌ ${provider.name} — failed: ${err.message.slice(0, 80)}`);
        }
    }
    console.log('');
}

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    setTimeout(checkProviders, 5000);
});
