const express = require('express');
const { register, login, logout, refresh, profile, forgotPassword, changePassword, updatePreferences, googleAuth } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/security');

const router = express.Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/google', authLimiter, googleAuth);
router.post('/refresh', refresh);
router.post('/forgot-password', forgotPassword);

// Protected routes
router.post('/logout', protect, logout);
router.get('/profile', protect, profile);
router.post('/change-password', protect, changePassword);
router.put('/preferences', protect, updatePreferences);

module.exports = router;
