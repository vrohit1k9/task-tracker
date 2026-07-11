const express = require('express');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

if (process.env.MOCK_DB === 'true' || process.env.MONGO_URI === 'mock') {
  const Module = require('module');
  const originalRequire = Module.prototype.require;
  const mockMongoose = require('./tests/mongooseMock');
  Module.prototype.require = function (id) {
    if (id === 'mongoose') {
      return mockMongoose;
    }
    return originalRequire.apply(this, arguments);
  };
  console.log('\x1b[33m[MOCK DB] In-memory database mock activated for local runtime!\x1b[0m');
}

const connectDB = require('./config/db');
const { setupSecurity } = require('./middleware/security');
const errorHandler = require('./middleware/errorMiddleware');
const reminderScheduler = require('./services/reminderScheduler');
const logger = require('./utils/logger');
const AppError = require('./utils/appError');

// Import routes
const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const reminderRoutes = require('./routes/reminderRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const adminRoutes = require('./routes/adminRoutes');
const auditRoutes = require('./routes/auditRoutes');

// Initialize app
const app = express();

// Parse body JSON
app.use(express.json());

// Set up security and request loggers
setupSecurity(app);

// Connect to Database
connectDB().then(async () => {
  if (process.env.MOCK_DB === 'true') {
    try {
      const seedData = require('./database/seed');
      await seedData();
      console.log('\x1b[32m[MOCK DB] Seeded in-memory database with sample students and courses!\x1b[0m');
    } catch (err) {
      console.error('Failed to seed in-memory mock database:', err.message);
    }
  }
});

// Serve Static Assets from Client
app.use(express.static(path.join(__dirname, '../client')));

// Bind routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/audit', auditRoutes);

// Fallback to static folder index.html for page routing
app.get('*', (req, res, next) => {
  if (req.originalUrl.startsWith('/api')) {
    return next(new AppError(`Endpoint ${req.originalUrl} not found on this server`, 404));
  }
  res.sendFile(path.join(__dirname, '../client', 'index.html'));
});

// Centralized error handler
app.use(errorHandler);

let server;

// Only start server and scheduler if not in testing environment
if (process.env.NODE_ENV !== 'test') {
  // Start reminder Scheduler (checks reminders every 30 seconds)
  reminderScheduler.startScheduler(30000);

  const PORT = process.env.PORT || 5000;
  server = app.listen(PORT, () => {
    logger.app(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  logger.error('CRITICAL_REJECTION', `Unhandled Rejection: ${err.message}`, err);
  // Close server & exit process
  if (server) {
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});

module.exports = app; // export for testing
