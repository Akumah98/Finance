const Bill = require('../models/Bill');
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

function startBillReminderScheduler() {
    // Check every hour
    setInterval(() => {
        checkBillReminders();
        checkOverdueBills();
    }, 60 * 60 * 1000);

    // Also run once on startup (after a short delay to let DB connect)
    setTimeout(() => {
        checkBillReminders();
        checkOverdueBills();
    }, 10000);

    console.log('Bill reminder scheduler started (hourly checks)');
}

module.exports = { startBillReminderScheduler, sendPushNotification };
