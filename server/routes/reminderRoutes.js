const express = require('express');
const { getReminders, createReminder, deleteReminder } = require('../controllers/reminderController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect); // Secure all reminder routes

router.route('/')
  .get(getReminders)
  .post(createReminder);

router.delete('/:id', deleteReminder);

module.exports = router;
