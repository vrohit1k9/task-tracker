const Notification = require('../models/Notification');
const logger = require('../utils/logger');

const sendMockEmail = async (email, subject, body) => {
  const logMessage = `EMAIL SENT TO: ${email}\nSUBJECT: ${subject}\nBODY: ${body}\n----------------------------------------`;
  logger.info('MOCK_EMAIL', logMessage);
  return true;
};

const createNotification = async (userId, type, message) => {
  try {
    const notification = await Notification.create({
      user: userId,
      type,
      message
    });
    
    logger.info('NOTIFICATION', `Created ${type} notification for User ID: ${userId}`);
    return notification;
  } catch (error) {
    logger.error('NOTIFICATION_ERROR', `Failed to create notification: ${error.message}`);
    throw error;
  }
};

const sendSystemAlert = async (user, message) => {
  // Save to db as system type
  await createNotification(user._id, 'system', message);
  
  // If user has email option enabled, send mock email
  // (we assume default preferences are true, we can check or mock it directly)
  await sendMockEmail(user.email, 'Student Task Tracker Alert', message);
  
  logger.info('SYSTEM_ALERT', `Sent alert to ${user.email}`);
};

module.exports = {
  sendMockEmail,
  createNotification,
  sendSystemAlert
};
