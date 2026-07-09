const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logToFile = (file, level, tag, message) => {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] [${level.toUpperCase()}] [${tag.toUpperCase()}] ${message}\n`;
  fs.appendFile(path.join(logsDir, file), logLine, (err) => {
    if (err) console.error('Failed to write log to file:', err);
  });
};

const logger = {
  info: (tag, message) => {
    console.log(`\x1b[32m[INFO]\x1b[0m \x1b[36m[${tag.toUpperCase()}]\x1b[0m ${message}`);
    logToFile('combined.log', 'info', tag, message);
  },
  warn: (tag, message) => {
    console.warn(`\x1b[33m[WARN]\x1b[0m \x1b[36m[${tag.toUpperCase()}]\x1b[0m ${message}`);
    logToFile('combined.log', 'warn', tag, message);
  },
  error: (tag, message, err = null) => {
    const errorDetails = err ? ` - ${err.message || err}\n${err.stack || ''}` : '';
    console.error(`\x1b[31m[ERROR]\x1b[0m \x1b[36m[${tag.toUpperCase()}]\x1b[0m ${message}${errorDetails}`);
    logToFile('combined.log', 'error', tag, `${message}${errorDetails}`);
    logToFile('error.log', 'error', tag, `${message}${errorDetails}`);
  },
  // Specialized Log Types
  app: (message) => {
    logger.info('APP', message);
  },
  request: (method, url, ip, status = '', duration = '') => {
    const msg = `${method} ${url} - IP: ${ip} ${status ? `- Status: ${status}` : ''} ${duration ? `- Duration: ${duration}ms` : ''}`;
    logger.info('REQ', msg);
    logToFile('requests.log', 'info', 'REQ', msg);
  },
  audit: (userId, action, details) => {
    const msg = `User: ${userId || 'GUEST'} - Action: ${action} - Details: ${JSON.stringify(details)}`;
    logger.info('AUDIT', msg);
    logToFile('audit.log', 'info', 'AUDIT', msg);
  },
  security: (ip, action, details) => {
    const msg = `IP: ${ip} - Security Alert: ${action} - Details: ${JSON.stringify(details)}`;
    logger.warn('SEC', msg);
    logToFile('security.log', 'warn', 'SEC', msg);
  }
};

module.exports = logger;
