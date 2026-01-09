// Achievement Level Thresholds
// Each achievement has 100 levels with increasing difficulty

const ACHIEVEMENT_LEVELS = {
    budgetMaster: [
        // Bronze (1-20)
        5, 10, 20, 30, 50, 75, 100, 150, 200, 250,
        300, 350, 400, 450, 500, 600, 700, 800, 900, 1000,
        // Silver (21-40)
        1200, 1400, 1600, 1800, 2000, 2500, 3000, 3500, 4000, 4500,
        5000, 5500, 6000, 6500, 7000, 8000, 9000, 10000, 11000, 12000,
        // Gold (41-60)
        13000, 14000, 15000, 16000, 17000, 18000, 19000, 20000, 22500, 25000,
        27500, 30000, 32500, 35000, 37500, 40000, 42500, 45000, 47500, 50000,
        // Platinum (61-80)
        55000, 60000, 65000, 70000, 75000, 80000, 85000, 90000, 95000, 100000,
        110000, 120000, 130000, 140000, 150000, 160000, 170000, 180000, 190000, 200000,
        // Diamond (81-100)
        220000, 240000, 260000, 280000, 300000, 325000, 350000, 375000, 400000, 450000,
        500000, 550000, 600000, 650000, 700000, 750000, 800000, 850000, 900000, 1000000
    ],

    savingsPro: [
        // Bronze (1-20)
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
        12, 14, 16, 18, 20, 22, 24, 26, 28, 30,
        // Silver (21-40)
        35, 40, 45, 50, 55, 60, 65, 70, 75, 80,
        85, 90, 95, 100, 110, 120, 130, 140, 150, 160,
        // Gold (41-60)
        170, 180, 190, 200, 220, 240, 260, 280, 300, 325,
        350, 375, 400, 425, 450, 475, 500, 550, 600, 650,
        // Platinum (61-80)
        700, 750, 800, 850, 900, 950, 1000, 1100, 1200, 1300,
        1400, 1500, 1600, 1700, 1800, 1900, 2000, 2200, 2400, 2600,
        // Diamond (81-100)
        2800, 3000, 3250, 3500, 3750, 4000, 4250, 4500, 4750, 5000,
        5500, 6000, 6500, 7000, 7500, 8000, 8500, 9000, 9500, 10000
    ],

    streakKing: [
        // Bronze (1-20)
        3, 5, 7, 10, 14, 21, 30, 45, 60, 75,
        90, 105, 120, 135, 150, 165, 180, 210, 240, 270,
        // Silver (21-40)
        300, 330, 365, 400, 450, 500, 550, 600, 650, 700,
        750, 800, 850, 900, 1000, 1100, 1200, 1300, 1400, 1500,
        // Gold (41-60)
        1600, 1700, 1800, 1900, 2000, 2200, 2400, 2600, 2800, 3000,
        3250, 3500, 3750, 4000, 4250, 4500, 4750, 5000, 5500, 6000,
        // Platinum (61-80)
        6500, 7000, 7500, 8000, 8500, 9000, 9500, 10000, 11000, 12000,
        13000, 14000, 15000, 16000, 17000, 18000, 19000, 20000, 22000, 24000,
        // Diamond (81-100)
        26000, 28000, 30000, 32000, 34000, 36000, 38000, 40000, 42000, 45000,
        48000, 51000, 54000, 57000, 60000, 63000, 66000, 69000, 72000, 75000
    ],

    debtSlayer: [
        // Bronze (1-20)
        1, 3, 5, 10, 15, 20, 25, 30, 40, 50,
        60, 70, 80, 90, 100, 125, 150, 175, 200, 250,
        // Silver (21-40)
        300, 350, 400, 450, 500, 600, 700, 800, 900, 1000,
        1100, 1200, 1300, 1400, 1500, 1750, 2000, 2250, 2500, 2750,
        // Gold (41-60)
        3000, 3250, 3500, 3750, 4000, 4500, 5000, 5500, 6000, 6500,
        7000, 7500, 8000, 8500, 9000, 10000, 11000, 12000, 13000, 14000,
        // Platinum (61-80)
        15000, 16000, 17000, 18000, 19000, 20000, 22000, 24000, 26000, 28000,
        30000, 32000, 34000, 36000, 38000, 40000, 42000, 44000, 46000, 50000,
        // Diamond (81-100)
        55000, 60000, 65000, 70000, 75000, 80000, 85000, 90000, 95000, 100000,
        110000, 120000, 130000, 140000, 150000, 160000, 170000, 180000, 190000, 200000
    ]
};

// Helper function to get tier name from level
const getTierName = (level) => {
    if (level <= 20) return 'Bronze';
    if (level <= 40) return 'Silver';
    if (level <= 60) return 'Gold';
    if (level <= 80) return 'Platinum';
    return 'Diamond';
};

// Helper function to get tier emoji
const getTierEmoji = (level) => {
    if (level <= 20) return '🥉';
    if (level <= 40) return '🥈';
    if (level <= 60) return '🥇';
    if (level <= 80) return '💎';
    return '💠';
};

// Calculate level from count
const calculateLevel = (achievementType, count) => {
    const thresholds = ACHIEVEMENT_LEVELS[achievementType];
    if (!thresholds) return 0;

    for (let i = 0; i < thresholds.length; i++) {
        if (count < thresholds[i]) {
            return i; // Return the level (0-indexed, so level 1 = index 0)
        }
    }
    return 100; // Max level
};

// Get progress to next level
const getProgressToNextLevel = (achievementType, count) => {
    const level = calculateLevel(achievementType, count);
    if (level >= 100) return { current: count, target: count, progress: 100 };

    const thresholds = ACHIEVEMENT_LEVELS[achievementType];
    const currentThreshold = level === 0 ? 0 : thresholds[level - 1];
    const nextThreshold = thresholds[level];

    const progress = ((count - currentThreshold) / (nextThreshold - currentThreshold)) * 100;

    return {
        current: count,
        target: nextThreshold,
        progress: Math.min(progress, 100)
    };
};

module.exports = {
    ACHIEVEMENT_LEVELS,
    getTierName,
    getTierEmoji,
    calculateLevel,
    getProgressToNextLevel
};
