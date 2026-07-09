const express = require('express');
const { getOverviewStats, getWeeklyReport, getMonthlyReport } = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect); // Secure all analytics routes

router.get('/overview', getOverviewStats);
router.get('/weekly', getWeeklyReport);
router.get('/monthly', getMonthlyReport);

module.exports = router;
