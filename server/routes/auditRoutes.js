const express = require('express');
const { getMyLogs } = require('../controllers/auditController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect); // Secure all audit routes

router.get('/my-logs', getMyLogs);

module.exports = router;
