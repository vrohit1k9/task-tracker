const Task = require('../models/Task');
const Category = require('../models/Category');
const AppError = require('../utils/appError');
const logAudit = require('../utils/auditLogger');
const catchAsync = require('../utils/catchAsync');

// @desc    Get user tasks with search, filter, sort, and pagination
// @route   GET /api/tasks
// @access  Private
exports.getTasks = catchAsync(async (req, res, next) => {
  const queryObj = { user: req.user.id };

  // 1. Search Query
  if (req.query.search) {
    queryObj.$or = [
      { title: { $regex: req.query.search, $options: 'i' } },
      { description: { $regex: req.query.search, $options: 'i' } }
    ];
  }

  // 2. Filtering
  if (req.query.status) {
    queryObj.status = req.query.status;
  }
  if (req.query.priority) {
    queryObj.priority = req.query.priority;
  }
  if (req.query.category) {
    queryObj.category = req.query.category;
  }

  // 3. Sorting
  let sortObj = {};
  if (req.query.sortBy) {
    const order = req.query.sortOrder === 'desc' ? -1 : 1;
    sortObj[req.query.sortBy] = order;
  } else {
    // Default sort: soonest due date first
    sortObj.dueDate = 1;
  }

  // 4. Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  // Execute query
  const total = await Task.countDocuments(queryObj);
  const tasks = await Task.find(queryObj)
    .populate('category')
    .sort(sortObj)
    .skip(skip)
    .limit(limit);

  res.status(200).json({
    success: true,
    count: tasks.length,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    },
    data: tasks
  });
});

// @desc    Create new task
// @route   POST /api/tasks
// @access  Private
exports.createTask = catchAsync(async (req, res, next) => {
  const { title, description, dueDate, priority, categoryId } = req.body;

  if (!title || !dueDate || !categoryId) {
    return next(new AppError('Please provide title, dueDate, and categoryId', 400));
  }

  // Verify category ownership
  const category = await Category.findOne({ _id: categoryId, user: req.user.id });
  if (!category) {
    return next(new AppError('Invalid category reference or unauthorized access', 404));
  }

  const task = await Task.create({
    title,
    description,
    dueDate,
    priority: priority || 'medium',
    category: categoryId,
    user: req.user.id
  });

  await logAudit(req.user.id, 'CREATE_TASK', req, { taskId: task._id, title: task.title });

  res.status(201).json({
    success: true,
    data: task
  });
});

// @desc    Update task
// @route   PUT /api/tasks/:id
// @access  Private
exports.updateTask = catchAsync(async (req, res, next) => {
  const { title, description, dueDate, priority, status, categoryId } = req.body;

  let task = await Task.findById(req.params.id);
  if (!task) {
    return next(new AppError('Task not found', 404));
  }

  // Check ownership
  if (task.user.toString() !== req.user.id) {
    return next(new AppError('Not authorized to access this task', 403));
  }

  // If changing category, verify ownership
  if (categoryId && categoryId !== task.category.toString()) {
    const category = await Category.findOne({ _id: categoryId, user: req.user.id });
    if (!category) {
      return next(new AppError('Invalid category reference', 400));
    }
    task.category = categoryId;
  }

  // Update properties
  if (title) task.title = title;
  if (description !== undefined) task.description = description;
  if (dueDate) task.dueDate = dueDate;
  if (priority) task.priority = priority;
  if (status) task.status = status;

  await task.save();

  await logAudit(req.user.id, 'UPDATE_TASK', req, { taskId: task._id, title: task.title });

  res.status(200).json({
    success: true,
    data: task
  });
});

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private
exports.deleteTask = catchAsync(async (req, res, next) => {
  const task = await Task.findById(req.params.id);
  if (!task) {
    return next(new AppError('Task not found', 404));
  }

  // Check ownership
  if (task.user.toString() !== req.user.id) {
    return next(new AppError('Not authorized to access this task', 403));
  }

  await Task.findByIdAndDelete(req.params.id);

  await logAudit(req.user.id, 'DELETE_TASK', req, { taskId: task._id, title: task.title });

  res.status(200).json({
    success: true,
    message: 'Task deleted successfully'
  });
});

// @desc    Mark task status as completed
// @route   PATCH /api/tasks/:id/complete
// @access  Private
exports.markComplete = catchAsync(async (req, res, next) => {
  let task = await Task.findById(req.params.id);
  if (!task) {
    return next(new AppError('Task not found', 404));
  }

  // Check ownership
  if (task.user.toString() !== req.user.id) {
    return next(new AppError('Not authorized to access this task', 403));
  }

  task.status = 'completed';
  await task.save();

  await logAudit(req.user.id, 'COMPLETE_TASK', req, { taskId: task._id });

  res.status(200).json({
    success: true,
    data: task
  });
});

// @desc    Bulk update tasks status, priority, or category
// @route   POST /api/tasks/bulk-update
// @access  Private
exports.bulkUpdate = catchAsync(async (req, res, next) => {
  const { ids, status, priority, categoryId } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return next(new AppError('Please provide an array of task IDs in fields "ids"', 400));
  }

  const updateFields = {};
  if (status) updateFields.status = status;
  if (priority) updateFields.priority = priority;

  if (categoryId) {
    const category = await Category.findOne({ _id: categoryId, user: req.user.id });
    if (!category) {
      return next(new AppError('Invalid category reference or unauthorized access', 400));
    }
    updateFields.category = categoryId;
  }

  if (Object.keys(updateFields).length === 0) {
    return next(new AppError('No valid fields provided for update. Provide status, priority, or categoryId', 400));
  }

  // Ensure user owns all tasks they are modifying
  const userTasksCount = await Task.countDocuments({ _id: { $in: ids }, user: req.user.id });
  if (userTasksCount !== ids.length) {
    return next(new AppError('One or more task IDs are invalid or unauthorized', 403));
  }

  const result = await Task.updateMany(
    { _id: { $in: ids }, user: req.user.id },
    { $set: updateFields }
  );

  await logAudit(req.user.id, 'BULK_UPDATE_TASKS', req, {
    taskIds: ids,
    updates: updateFields,
    modifiedCount: result.modifiedCount
  });

  res.status(200).json({
    success: true,
    message: `Successfully updated ${result.modifiedCount} tasks.`,
    modifiedCount: result.modifiedCount
  });
});

// @desc    Bulk delete tasks
// @route   POST /api/tasks/bulk-delete
// @access  Private
exports.bulkDelete = catchAsync(async (req, res, next) => {
  const { ids } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return next(new AppError('Please provide an array of task IDs in fields "ids"', 400));
  }

  // Ensure user owns all tasks they are deleting
  const userTasksCount = await Task.countDocuments({ _id: { $in: ids }, user: req.user.id });
  if (userTasksCount !== ids.length) {
    return next(new AppError('One or more task IDs are invalid or unauthorized', 403));
  }

  const result = await Task.deleteMany({ _id: { $in: ids }, user: req.user.id });

  await logAudit(req.user.id, 'BULK_DELETE_TASKS', req, {
    taskIds: ids,
    deletedCount: result.deletedCount
  });

  res.status(200).json({
    success: true,
    message: `Successfully deleted ${result.deletedCount} tasks.`,
    deletedCount: result.deletedCount
  });
});
