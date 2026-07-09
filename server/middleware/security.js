const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const helmet = require('helmet');
const cors = require('cors');
const logger = require('../utils/logger');

// Custom HTML Stripper for XSS Protection
const cleanXss = (obj) => {
  if (typeof obj === 'string') {
    // Strip HTML tags using a regex
    return obj.replace(/<[^>]*>/g, '');
  } else if (Array.isArray(obj)) {
    return obj.map(item => cleanXss(item));
  } else if (obj !== null && typeof obj === 'object') {
    const cleaned = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cleaned[key] = cleanXss(obj[key]);
      }
    }
    return cleaned;
  }
  return obj;
};

const xssSanitizer = (req, res, next) => {
  if (req.body) req.body = cleanXss(req.body);
  if (req.query) req.query = cleanXss(req.query);
  if (req.params) req.params = cleanXss(req.params);
  next();
};

// Global rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth specific rate limiter
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 30, // limit each IP to 30 requests per hour for login/register
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP, please try again after an hour.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Request duration tracker and logger middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.request(req.method, req.originalUrl, req.ip, res.statusCode, duration);
  });
  next();
};

const setupSecurity = (app) => {
  // Set security HTTP headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"]
      }
    }
  }));

  // Enable CORS
  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  // Data sanitization against NoSQL query injection
  app.use(mongoSanitize());

  // Input sanitization against XSS
  app.use(xssSanitizer);

  // Rate Limiting
  app.use('/api', limiter);

  // Application logs
  app.use(requestLogger);
};

module.exports = {
  setupSecurity,
  authLimiter
};
