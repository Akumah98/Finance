const express = require('express');
const router = express.Router();
const { calculateHealthScore } = require('../services/healthScoreService');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

// GET /api/health-score
router.get('/', async (req, res) => {
    try {
        const healthData = await calculateHealthScore(req.user._id);
        res.json(healthData);
    } catch (err) {
        console.error('Health score error:', err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
