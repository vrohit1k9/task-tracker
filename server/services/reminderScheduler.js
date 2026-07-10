const Reminder = require('../models/Reminder');
const Task = require('../models/Task');
const User = require('../models/User');
const notificationService = require('./notificationService');
const logger = require('../utils/logger');

let schedulerIntervalId = null;

const checkDeadlines = async () => {
  try {
    const now = new Date();
    // Find all tasks that are due, not completed, and haven't sent a deadline alert yet
    const pendingTasks = await Task.find({
      status: { $ne: 'completed' },
      dueDate: { $lte: now },
      deadlineAlertSent: { $ne: true }
    }).populate('user');

    if (pendingTasks.length === 0) return;

    logger.info('SCHEDULER', `Found ${pendingTasks.length} tasks with reached deadlines to alert.`);

    for (const task of pendingTasks) {
      if (!task.user) {
        task.deadlineAlertSent = true;
        await task.save();
        continue;
      }

      const taskTitle = task.title;
      const userName = task.user.username;
      const message = `Hello ${userName}, the deadline for your task "${taskTitle}" has been reached!`;

      // 1. Create a system notification
      await notificationService.createNotification(task.user._id, 'system', message);

      // 2. Create browser notification
      await notificationService.createNotification(task.user._id, 'browser', `Deadline Reached: "${taskTitle}"`);

      // 3. Send mock email
      await notificationService.sendMockEmail(
        task.user.email,
        `Deadline Reached: Task "${taskTitle}"`,
        message
      );

      // 4. Mark as sent
      task.deadlineAlertSent = true;
      await task.save();

      logger.info('SCHEDULER', `Sent deadline notification for Task: "${taskTitle}" to User: ${userName}`);
    }
  } catch (error) {
    logger.error('SCHEDULER_ERROR', 'Error checking task deadlines in background scheduler', error);
  }
};

const checkReminders = async () => {
  try {
    // Also check task deadlines
    await checkDeadlines();

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
