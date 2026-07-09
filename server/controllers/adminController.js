const User = require('../models/User');
const Task = require('../models/Task');
const Category = require('../models/Category');
const Notification = require('../models/Notification');
const Reminder = require('../models/Reminder');
const UserPreference = require('../models/UserPreference');
const AuditLog = require('../models/AuditLog');
const AppError = require('../utils/appError');
const logAudit = require('../utils/auditLogger');
const catchAsync = require('../utils/catchAsync');

// @desc    Get all users list (Admin only)
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getAllUsers = catchAsync(async (req, res, next) => {
  const queryObj = {};

  if (req.query.search) {
    queryObj.$or = [
      { username: { $regex: req.query.search, $options: 'i' } },
      { email: { $regex: req.query.search, $options: 'i' } }
    ];
  }

  const users = await User.find(queryObj).select('-password -refreshTokens').sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: users.length,
    data: users
  });
});

// @desc    Update user role (Admin only)
// @route   PUT /api/admin/users/:id/role
// @access  Private/Admin
exports.updateUserRole = catchAsync(async (req, res, next) => {
  const { role } = req.body;

  if (!role || !['student', 'admin'].includes(role)) {
    return next(new AppError('Invalid role choice', 400));
  }

  // Prevent admin from demoting themselves
  if (req.user.id === req.params.id) {
    return next(new AppError('You cannot change your own role', 400));
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  const oldRole = user.role;
  user.role = role;
  await user.save();

  await logAudit(req.user.id, 'ADMIN_UPDATE_USER_ROLE', req, {
    targetUserId: user._id,
    targetEmail: user.email,
    oldRole,
    newRole: role
  });

  res.status(200).json({
    success: true,
    message: `User role updated from ${oldRole} to ${role}`,
    data: {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role
    }
  });
});

// @desc    Delete user and cascade delete all their data (Admin only)
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
exports.deleteUser = catchAsync(async (req, res, next) => {
  // Prevent admin from deleting themselves
  if (req.user.id === req.params.id) {
    return next(new AppError('You cannot delete your own account', 400));
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Cascade delete all records belonging to this user
  const deletedTasks = await Task.deleteMany({ user: user._id });
  const deletedCategories = await Category.deleteMany({ user: user._id });
  const deletedNotifications = await Notification.deleteMany({ user: user._id });
  const deletedReminders = await Reminder.deleteMany({ user: user._id });
  const deletedPreferences = await UserPreference.deleteMany({ user: user._id });
  const deletedAuditLogs = await AuditLog.deleteMany({ user: user._id });

  await User.findByIdAndDelete(req.params.id);

  await logAudit(req.user.id, 'ADMIN_DELETE_USER', req, {
    targetUserId: user._id,
    targetEmail: user.email,
    cascadeStats: {
      tasks: deletedTasks.deletedCount,
      categories: deletedCategories.deletedCount,
      notifications: deletedNotifications.deletedCount,
      reminders: deletedReminders.deletedCount,
      preferences: deletedPreferences.deletedCount,
      auditLogs: deletedAuditLogs.deletedCount
    }
  });

  res.status(200).json({
    success: true,
    message: `User ${user.email} and all associated tasks, categories, preferences, and notifications have been deleted.`
  });
});

// @desc    Get global system dashboard stats (Admin only)
// @route   GET /api/admin/stats
// @access  Private/Admin
exports.getSystemStats = catchAsync(async (req, res, next) => {
  const userCount = await User.countDocuments();
  const taskCount = await Task.countDocuments();
  const categoryCount = await Category.countDocuments();
  const notificationCount = await Notification.countDocuments();
  const reminderCount = await Reminder.countDocuments();
  const auditLogCount = await AuditLog.countDocuments();

  // Role stats
  const rolesBreakdown = await User.aggregate([
    { $group: { _id: '$role', count: { $sum: 1 } } }
  ]);

  const roles = { student: 0, admin: 0 };
  rolesBreakdown.forEach(item => {
    if (roles[item._id] !== undefined) {
      roles[item._id] = item.count;
    }
  });

  // Task Status distribution across system
  const statusStats = await Task.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  const taskDistribution = { pending: 0, 'in-progress': 0, completed: 0 };
  statusStats.forEach(item => {
    if (taskDistribution[item._id] !== undefined) {
      taskDistribution[item._id] = item.count;
    }
  });

  res.status(200).json({
    success: true,
    data: {
      counts: {
        users: userCount,
        tasks: taskCount,
        categories: categoryCount,
        notifications: notificationCount,
        reminders: reminderCount,
        auditLogs: auditLogCount
      },
      roles,
      taskDistribution
    }
  });
});
