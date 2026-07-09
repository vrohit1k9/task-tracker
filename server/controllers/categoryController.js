const Category = require('../models/Category');
const Task = require('../models/Task');
const AppError = require('../utils/appError');
const logAudit = require('../utils/auditLogger');
const catchAsync = require('../utils/catchAsync');

// @desc    Get all categories for authenticated user
// @route   GET /api/categories
// @access  Private
exports.getCategories = catchAsync(async (req, res, next) => {
  const categories = await Category.find({ user: req.user.id });

  res.status(200).json({
    success: true,
    count: categories.length,
    data: categories
  });
});

// @desc    Create a category
// @route   POST /api/categories
// @access  Private
exports.createCategory = catchAsync(async (req, res, next) => {
  const { name, color } = req.body;

  if (!name) {
    return next(new AppError('Category name is required', 400));
  }

  // Check if category name already exists for this user
  const duplicate = await Category.findOne({ user: req.user.id, name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } });
  if (duplicate) {
    return next(new AppError('Category with this name already exists', 400));
  }

  const category = await Category.create({
    name: name.trim(),
    color,
    user: req.user.id
  });

  await logAudit(req.user.id, 'CREATE_CATEGORY', req, { categoryId: category._id, name: category.name });

  res.status(201).json({
    success: true,
    data: category
  });
});

// @desc    Update a category
// @route   PUT /api/categories/:id
// @access  Private
exports.updateCategory = catchAsync(async (req, res, next) => {
  const { name, color } = req.body;

  let category = await Category.findById(req.params.id);

  if (!category) {
    return next(new AppError('Category not found', 404));
  }

  // Check ownership
  if (category.user.toString() !== req.user.id) {
    return next(new AppError('Not authorized to edit this category', 403));
  }

  // If changing name, check duplicates
  if (name && name.trim().toLowerCase() !== category.name.toLowerCase()) {
    const duplicate = await Category.findOne({
      user: req.user.id,
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
    });
    if (duplicate) {
      return next(new AppError('Category with this name already exists', 400));
    }
    category.name = name.trim();
  }

  if (color) {
    category.color = color;
  }

  await category.save();

  await logAudit(req.user.id, 'UPDATE_CATEGORY', req, { categoryId: category._id, name: category.name });

  res.status(200).json({
    success: true,
    data: category
  });
});

// @desc    Delete a category
// @route   DELETE /api/categories/:id
// @access  Private
exports.deleteCategory = catchAsync(async (req, res, next) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    return next(new AppError('Category not found', 404));
  }

  // Check ownership
  if (category.user.toString() !== req.user.id) {
    return next(new AppError('Not authorized to delete this category', 403));
  }

  // Cannot delete 'General' category (safeguard)
  if (category.name.toLowerCase() === 'general') {
    return next(new AppError('Cannot delete the default General category', 400));
  }

  // Find or create 'General' category for reassigning orphaned tasks
  let generalCategory = await Category.findOne({ user: req.user.id, name: 'General' });
  if (!generalCategory) {
    generalCategory = await Category.create({
      name: 'General',
      color: '#4f46e5',
      user: req.user.id
    });
  }

  // Reassign all tasks under this category to 'General'
  const taskUpdateResult = await Task.updateMany(
    { user: req.user.id, category: category._id },
    { category: generalCategory._id }
  );

  await Category.findByIdAndDelete(req.params.id);

  await logAudit(req.user.id, 'DELETE_CATEGORY', req, {
    categoryId: category._id,
    name: category.name,
    reassignedTasksCount: taskUpdateResult.modifiedCount
  });

  res.status(200).json({
    success: true,
    message: `Category deleted successfully. ${taskUpdateResult.modifiedCount} tasks were reassigned to the "General" category.`,
    reassignedCount: taskUpdateResult.modifiedCount
  });
});
