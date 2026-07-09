const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');

const protect = async (req, res, next) => {
  try {
    let token;

    // Read token from Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new AppError('Not authorized to access this route, please log in', 401));
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'jwt_secret_fallback_key_for_dev_32_chars');

    // Get user from database
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      logger.security(req.ip, 'TOKEN_USER_NOT_FOUND', { userId: decoded.id });
      return next(new AppError('The user belonging to this token no longer exists', 401));
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Your token has expired. Please refresh or log in again', 401));
    }
    return next(new AppError(`Not authorized, token is invalid: ${error.message}`, 401));
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      logger.security(req.ip, 'UNAUTHORIZED_ACCESS_ATTEMPT', {
        userId: req.user ? req.user.id : 'GUEST',
        role: req.user ? req.user.role : 'NONE',
        path: req.originalUrl
      });
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };
};

module.exports = {
  protect,
  authorize
};
