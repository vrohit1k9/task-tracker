const AuditLog = require('../models/AuditLog');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

// @desc    Get user's personal audit logs / login history
// @route   GET /api/audit/my-logs
// @access  Private
exports.getMyLogs = catchAsync(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const total = await AuditLog.countDocuments({ user: req.user.id });
  const logs = await AuditLog.find({ user: req.user.id })
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit);

  res.status(200).json({
    success: true,
    count: logs.length,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    },
    data: logs
  });
});

// @desc    Get system-wide audit logs (Admin only)
// @route   GET /api/admin/audit-logs
// @access  Private/Admin
exports.getSystemAuditLogs = catchAsync(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 50;
  const skip = (page - 1) * limit;

  const queryObj = {};

  // Filter by user ID if provided
  if (req.query.userId) {
    queryObj.user = req.query.userId;
  }

  // Filter by action (e.g. LOGIN_SUCCESS, FORGOT_PASSWORD_REQUEST)
  if (req.query.action) {
    queryObj.action = req.query.action;
  }

  // Filter by IP Address
  if (req.query.ipAddress) {
    queryObj.ipAddress = req.query.ipAddress;
  }

  const total = await AuditLog.countDocuments(queryObj);
  const logs = await AuditLog.find(queryObj)
    .populate('user', 'username email role')
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit);

  res.status(200).json({
    success: true,
    count: logs.length,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    },
    data: logs
  });
});
