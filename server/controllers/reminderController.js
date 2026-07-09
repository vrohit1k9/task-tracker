const Reminder = require('../models/Reminder');
const Task = require('../models/Task');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

// @desc    Get user reminders
// @route   GET /api/reminders
// @access  Private
exports.getReminders = catchAsync(async (req, res, next) => {
  const reminders = await Reminder.find({ user: req.user.id })
    .populate('task')
    .sort({ remindAt: 1 });

  res.status(200).json({
    success: true,
    count: reminders.length,
    data: reminders
  });
});

// @desc    Create/Schedule a reminder
// @route   POST /api/reminders
// @access  Private
exports.createReminder = catchAsync(async (req, res, next) => {
  const { taskId, remindAt } = req.body;

  if (!taskId || !remindAt) {
    return next(new AppError('Please provide taskId and remindAt time', 400));
  }

  // Verify task ownership
  const task = await Task.findOne({ _id: taskId, user: req.user.id });
  if (!task) {
    return next(new AppError('Task not found or unauthorized access', 404));
  }

  const remindTime = new Date(remindAt);
  if (remindTime < new Date()) {
    return next(new AppError('Reminder time must be in the future', 400));
  }

  const reminder = await Reminder.create({
    task: taskId,
    user: req.user.id,
    remindAt: remindTime
  });

  res.status(201).json({
    success: true,
    data: reminder
  });
});

// @desc    Delete/Cancel a reminder
// @route   DELETE /api/reminders/:id
// @access  Private
exports.deleteReminder = catchAsync(async (req, res, next) => {
  const reminder = await Reminder.findById(req.params.id);

  if (!reminder) {
    return next(new AppError('Reminder not found', 404));
  }

  if (reminder.user.toString() !== req.user.id) {
    return next(new AppError('Not authorized to access this reminder', 403));
  }

  await Reminder.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Reminder cancelled successfully'
  });
});
