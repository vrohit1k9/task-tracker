const Reminder = require('../models/Reminder');
const Task = require('../models/Task');
const User = require('../models/User');
const notificationService = require('./notificationService');
const logger = require('../utils/logger');

let schedulerIntervalId = null;

const checkReminders = async () => {
  try {
    const now = new Date();
    // Find all reminders scheduled for now or in the past that have not been sent
    const pendingReminders = await Reminder.find({
      sent: false,
      remindAt: { $lte: now }
    }).populate('task').populate('user');

    if (pendingReminders.length === 0) return;

    logger.info('SCHEDULER', `Found ${pendingReminders.length} pending reminders to process.`);

    for (const reminder of pendingReminders) {
      if (!reminder.task || !reminder.user) {
        // If task or user was deleted, just mark as sent/processed
        reminder.sent = true;
        await reminder.save();
        continue;
      }

      const taskTitle = reminder.task.title;
      const userName = reminder.user.username;
      const message = `Hello ${userName}, this is a reminder that your task "${taskTitle}" is due on ${reminder.task.dueDate.toLocaleString()}`;

      // 1. Create a system notification
      await notificationService.createNotification(reminder.user._id, 'system', message);

      // 2. Send browser mock notification
      await notificationService.createNotification(reminder.user._id, 'browser', `Task Reminder: "${taskTitle}" is due soon.`);

      // 3. Send mock email
      await notificationService.sendMockEmail(
        reminder.user.email,
        `Reminder: Task "${taskTitle}" is due soon`,
        message
      );

      // 4. Mark reminder as sent
      reminder.sent = true;
      await reminder.save();

      logger.info('SCHEDULER', `Processed reminder ID: ${reminder._id} for Task: "${taskTitle}"`);
    }
  } catch (error) {
    logger.error('SCHEDULER_ERROR', 'Error checking reminders in background scheduler', error);
  }
};

const startScheduler = (intervalMs = 30000) => {
  if (schedulerIntervalId) {
    clearInterval(schedulerIntervalId);
  }
  
  // Run check immediately
  checkReminders();
  
  schedulerIntervalId = setInterval(checkReminders, intervalMs);
  logger.info('SCHEDULER', `Background reminder scheduler started (interval: ${intervalMs}ms)`);
};

const stopScheduler = () => {
  if (schedulerIntervalId) {
    clearInterval(schedulerIntervalId);
    schedulerIntervalId = null;
    logger.info('SCHEDULER', 'Background reminder scheduler stopped');
  }
};

const scheduleReminder = async (taskId, userId, remindAt) => {
  try {
    const reminder = await Reminder.create({
      task: taskId,
      user: userId,
      remindAt
    });
    logger.info('SCHEDULER', `Scheduled a new reminder for Task ${taskId} at ${remindAt}`);
    return reminder;
  } catch (error) {
    logger.error('SCHEDULER_ERROR', `Failed to schedule reminder: ${error.message}`);
    throw error;
  }
};

module.exports = {
  startScheduler,
  stopScheduler,
  scheduleReminder
};
