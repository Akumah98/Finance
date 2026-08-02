const Bill = require('../models/Bill');
const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

async function sendPushNotification(pushToken, title, body) {
    try {
        await fetch(EXPO_PUSH_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                to: pushToken,
                title,
                body,
                sound: 'default',
            }),
        });
    } catch (err) {
        console.error('Push notification failed:', err.message);
    }
}

async function checkBillReminders() {
    try {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(23, 59, 59, 999);

        // Find unpaid bills due within the next 24 hours
        const dueBills = await Bill.find({
            isPaid: false,
            dueDate: { $gte: now, $lte: tomorrow }
        }).lean();

        if (dueBills.length === 0) return;

        // Group bills by userId
        const billsByUser = {};
        for (const bill of dueBills) {
            const uid = bill.userId.toString();
            if (!billsByUser[uid]) billsByUser[uid] = [];
            billsByUser[uid].push(bill);
        }

        // Send notifications per user
        for (const [userId, bills] of Object.entries(billsByUser)) {
            const user = await User.findById(userId).select('pushToken userName').lean();
            if (!user || !user.pushToken) continue;

            if (bills.length === 1) {
                const bill = bills[0];
                await sendPushNotification(
                    user.pushToken,
                    'Bill Due Soon',
                    `${bill.name} (${bill.amount}) is due today or tomorrow.`
                );
            } else {
                await sendPushNotification(
                    user.pushToken,
                    `${bills.length} Bills Due Soon`,
                    `You have ${bills.length} bills due in the next 24 hours. Total: ${bills.reduce((s, b) => s + b.amount, 0).toFixed(0)}`
                );
            }
        }

        console.log(`Bill reminders: checked ${dueBills.length} bills for ${Object.keys(billsByUser).length} users`);
    } catch (err) {
        console.error('Bill reminder check failed:', err.message);
    }
}

// Also check for overdue bills (past due but not paid)
async function checkOverdueBills() {
    try {
        const now = new Date();
        const threeDaysAgo = new Date(now);
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        // Find bills that became overdue in the last 3 days (avoid spamming for very old bills)
        const overdueBills = await Bill.find({
            isPaid: false,
            dueDate: { $lt: now, $gte: threeDaysAgo }
        }).lean();

        if (overdueBills.length === 0) return;

        const billsByUser = {};
        for (const bill of overdueBills) {
            const uid = bill.userId.toString();
            if (!billsByUser[uid]) billsByUser[uid] = [];
            billsByUser[uid].push(bill);
        }

        for (const [userId, bills] of Object.entries(billsByUser)) {
            const user = await User.findById(userId).select('pushToken').lean();
            if (!user || !user.pushToken) continue;

            await sendPushNotification(
                user.pushToken,
                'Overdue Bills',
                `You have ${bills.length} overdue bill${bills.length > 1 ? 's' : ''}. Don't forget to pay!`
            );
        }
    } catch (err) {
        console.error('Overdue bill check failed:', err.message);
    }
}

// Smart Budget Alerts: notify when user exceeds 80% of a budget
async function checkBudgetAlerts() {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        const budgets = await Budget.find({}).lean();
        if (budgets.length === 0) return;

        const budgetsByUser = {};
        for (const budget of budgets) {
            const uid = budget.userId.toString();
            if (!budgetsByUser[uid]) budgetsByUser[uid] = [];
            budgetsByUser[uid].push(budget);
        }

        for (const [userId, userBudgets] of Object.entries(budgetsByUser)) {
            const transactions = await Transaction.find({
                userId,
                type: 'expense',
                date: { $gte: startOfMonth, $lte: endOfMonth }
            }).lean();

            const spendingByCategory = {};
            for (const tx of transactions) {
                spendingByCategory[tx.category] = (spendingByCategory[tx.category] || 0) + tx.amount;
            }

            const alerts = [];
            for (const budget of userBudgets) {
                const spent = spendingByCategory[budget.category] || 0;
                const pct = (spent / budget.amount) * 100;
                if (pct >= 80 && pct < 100) {
                    alerts.push({ category: budget.category, pct: Math.round(pct), spent, budget: budget.amount });
                } else if (pct >= 100) {
                    alerts.push({ category: budget.category, pct: Math.round(pct), spent, budget: budget.amount, over: true });
                }
            }

            if (alerts.length === 0) continue;

            const user = await User.findById(userId).select('pushToken').lean();
            if (!user || !user.pushToken) continue;

            const overBudget = alerts.filter(a => a.over);
            const nearBudget = alerts.filter(a => !a.over);

            if (overBudget.length > 0) {
                const names = overBudget.map(a => a.category).join(', ');
                await sendPushNotification(
                    user.pushToken,
                    'Budget Exceeded',
                    `You've gone over budget on: ${names}. Review your spending.`
                );
            } else if (nearBudget.length > 0) {
                const top = nearBudget[0];
                await sendPushNotification(
                    user.pushToken,
                    'Budget Warning',
                    `${top.category} is at ${top.pct}% (${Math.round(top.spent).toLocaleString()} of ${Math.round(top.budget).toLocaleString()} FCFA). Slow down!`
                );
            }
        }
    } catch (err) {
        console.error('Budget alert check failed:', err.message);
    }
}

// Weekly Report Card: sent every Sunday
async function sendWeeklyReports() {
    try {
        const now = new Date();
        if (now.getDay() !== 0) return; // Only run on Sundays

        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - 7);
        startOfWeek.setHours(0, 0, 0, 0);

        const users = await User.find({ pushToken: { $exists: true, $ne: null } }).select('_id pushToken').lean();

        for (const user of users) {
            const transactions = await Transaction.find({
                userId: user._id,
                date: { $gte: startOfWeek, $lte: now }
            }).lean();

            if (transactions.length === 0) continue;

            const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
            const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
            const savingsRate = income > 0 ? Math.round(((income - expenses) / income) * 100) : 0;

            const billsPaid = await Bill.countDocuments({
                userId: user._id,
                isPaid: true,
                updatedAt: { $gte: startOfWeek }
            });

            let body = `This week: ${Math.round(expenses).toLocaleString()} FCFA spent`;
            if (income > 0) body += `, ${Math.round(income).toLocaleString()} earned`;
            if (billsPaid > 0) body += `, ${billsPaid} bill${billsPaid > 1 ? 's' : ''} paid`;
            if (income > 0) body += `. Savings rate: ${savingsRate}%`;

            await sendPushNotification(user.pushToken, 'Weekly Report Card', body);
        }

        console.log(`Weekly reports sent to ${users.length} users`);
    } catch (err) {
        console.error('Weekly report failed:', err.message);
    }
}

function startBillReminderScheduler() {
    // Check every hour
    setInterval(() => {
        checkBillReminders();
        checkOverdueBills();
        checkBudgetAlerts();
    }, 60 * 60 * 1000);

    // Weekly report check every hour (only fires on Sundays)
    setInterval(sendWeeklyReports, 60 * 60 * 1000);

    // Run on startup
    setTimeout(() => {
        checkBillReminders();
        checkOverdueBills();
        checkBudgetAlerts();
    }, 10000);

    console.log('Bill reminder scheduler started (hourly checks + budget alerts + weekly reports)');
}

module.exports = { startBillReminderScheduler, sendPushNotification };
