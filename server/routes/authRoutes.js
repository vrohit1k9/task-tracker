const express = require('express');
const { register, login, logout, refresh, profile, forgotPassword, changePassword, updatePreferences, googleAuth, googleTokenAuth } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/security');

const router = express.Router();

router.get('/config', (req, res) => {
  res.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID || ''
  });
});

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/google', authLimiter, googleAuth);
router.post('/google-token', authLimiter, googleTokenAuth);
router.post('/refresh', refresh);
router.post('/forgot-password', forgotPassword);

// Protected routes
router.post('/logout', protect, logout);
router.get('/profile', protect, profile);
router.post('/change-password', protect, changePassword);
router.put('/preferences', protect, updatePreferences);

module.exports = router;
