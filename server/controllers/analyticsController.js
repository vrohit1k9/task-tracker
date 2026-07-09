const Task = require('../models/Task');
const Category = require('../models/Category');
const mongoose = require('mongoose');
const catchAsync = require('../utils/catchAsync');

// @desc    Get dashboard overview statistics
// @route   GET /api/analytics/overview
// @access  Private
exports.getOverviewStats = catchAsync(async (req, res, next) => {
  const userId = new mongoose.Types.ObjectId(req.user.id);
  const now = new Date();

  // 1. Status Breakdown
  const statusStats = await Task.aggregate([
    { $match: { user: userId } },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  const stats = {
    pending: 0,
    inProgress: 0,
    completed: 0,
    total: 0,
    overdue: 0,
    completionRate: 0
  };

  statusStats.forEach(item => {
    if (item._id === 'pending') stats.pending = item.count;
    if (item._id === 'in-progress') stats.inProgress = item.count;
    if (item._id === 'completed') stats.completed = item.count;
    stats.total += item.count;
  });

  // Calculate completion rate
  stats.completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  // 2. Overdue count (not completed, due date in the past)
  stats.overdue = await Task.countDocuments({
    user: userId,
    status: { $ne: 'completed' },
    dueDate: { $lt: now }
  });

  // 3. Priority breakdown
  const priorityStats = await Task.aggregate([
    { $match: { user: userId } },
    { $group: { _id: '$priority', count: { $sum: 1 } } }
  ]);

  const priorityBreakdown = { low: 0, medium: 0, high: 0 };
  priorityStats.forEach(item => {
    if (priorityBreakdown[item._id] !== undefined) {
      priorityBreakdown[item._id] = item.count;
    }
  });

  // 4. Tasks grouped by category
  const categoryStats = await Task.aggregate([
    { $match: { user: userId } },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        completed: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        }
      }
    },
    {
      $lookup: {
        from: 'categories',
        localField: '_id',
        foreignField: '_id',
        as: 'categoryDetails'
      }
    },
    { $unwind: '$categoryDetails' },
    {
      $project: {
        _id: 1,
        name: '$categoryDetails.name',
        color: '$categoryDetails.color',
        count: 1,
        completed: 1
      }
    }
  ]);

  res.status(200).json({
    success: true,
    data: {
      stats,
      priorityBreakdown,
      categoryStats
    }
  });
});

// @desc    Get weekly completion activity
// @route   GET /api/analytics/weekly
// @access  Private
exports.getWeeklyReport = catchAsync(async (req, res, next) => {
  const userId = new mongoose.Types.ObjectId(req.user.id);
  const now = new Date();
  
  // Set start of week (7 days ago)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(now.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  // Find tasks completed in the last 7 days grouped by completion day
  // Since we don't store `completedAt` on task itself, we can use the `updatedAt` for completed tasks
  const completedTasksByDay = await Task.aggregate([
    {
      $match: {
        user: userId,
        status: 'completed',
        updatedAt: { $gte: sevenDaysAgo }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } },
        completedCount: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // Also query newly created tasks in the same interval
  const createdTasksByDay = await Task.aggregate([
    {
      $match: {
        user: userId,
        createdAt: { $gte: sevenDaysAgo }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        createdCount: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // Construct a continuous 7-day timeline
  const labels = [];
  const completedData = [];
  const createdData = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(now.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    
    // Format label as readable name e.g. "Mon", "Tue"
    const weekdayStr = d.toLocaleDateString('en-US', { weekday: 'short' });
    labels.push(weekdayStr);

    const completedDay = completedTasksByDay.find(item => item._id === dateStr);
    completedData.push(completedDay ? completedDay.completedCount : 0);

    const createdDay = createdTasksByDay.find(item => item._id === dateStr);
    createdData.push(createdDay ? createdDay.createdCount : 0);
  }

  res.status(200).json({
    success: true,
    data: {
      labels,
      completed: completedData,
      created: createdData
    }
  });
});

// @desc    Get monthly completion stats
// @route   GET /api/analytics/monthly
// @access  Private
exports.getMonthlyReport = catchAsync(async (req, res, next) => {
  const userId = new mongoose.Types.ObjectId(req.user.id);
  const now = new Date();
  
  // Set start of month (30 days ago)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(now.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const completedTasks = await Task.aggregate([
    {
      $match: {
        user: userId,
        status: 'completed',
        updatedAt: { $gte: thirtyDaysAgo }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } },
        completedCount: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  res.status(200).json({
    success: true,
    data: completedTasks
  });
});
