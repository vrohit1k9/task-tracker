const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    err.message = message;
    err.statusCode = 400;
  }

  // Handle Mongoose duplicate key errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    err.message = `Duplicate field value entered for key: ${field}. Please use another value.`;
    err.statusCode = 400;
  }

  // Handle Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    err.message = `Resource not found with id of ${err.value}`;
    err.statusCode = 404;
  }

  // Handle JWT signature error
  if (err.name === 'JsonWebTokenError') {
    err.message = 'Invalid token. Please log in again.';
    err.statusCode = 401;
  }

  // Handle JWT expired error
  if (err.name === 'TokenExpiredError') {
    err.message = 'Token expired. Please log in again.';
    err.statusCode = 401;
  }

  // Log error using logger utility
  logger.error('ERROR_MIDDLEWARE', `Error on ${req.method} ${req.url}: ${err.message}`, err);

  res.status(err.statusCode).json({
    success: false,
    status: err.status,
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

module.exports = errorHandler;
