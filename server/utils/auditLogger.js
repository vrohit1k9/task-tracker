const AuditLog = require('../models/AuditLog');
const logger = require('./logger');

const logAudit = async (userId, action, req, details = {}) => {
  try {
    const ipAddress = req ? req.ip || req.connection.remoteAddress : 'unknown';
    
    // Save to Database
    await AuditLog.create({
      user: userId || null,
      action,
      ipAddress,
      details
    });

    // Write to combined/audit log file and console
    logger.audit(userId, action, details);
  } catch (error) {
    logger.error('AUDIT_LOG_ERROR', `Failed to write audit log: ${error.message}`);
  }
};

module.exports = logAudit;
