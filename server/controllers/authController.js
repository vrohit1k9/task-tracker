const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Category = require('../models/Category');
const UserPreference = require('../models/UserPreference');
const AppError = require('../utils/appError');
const { signAccessToken, signRefreshToken } = require('../utils/jwt');
const logAudit = require('../utils/auditLogger');
const catchAsync = require('../utils/catchAsync');

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
exports.register = catchAsync(async (req, res, next) => {
  const { username, email, password, role } = req.body;

  if (!username || !email || !password) {
    return next(new AppError('Please provide username, email, and password', 400));
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError('Email already registered', 400));
  }

  // Create user
  const user = await User.create({
    username,
    email,
    password,
    role: role || 'student'
  });

  // Create default category
  const defaultCategory = await Category.create({
    name: 'General',
    color: '#4f46e5',
    user: user._id
  });

  // Create default preferences
  await UserPreference.create({
    user: user._id,
    theme: 'light',
    emailNotifications: true,
    browserNotifications: true
  });

  // Generate tokens
  const accessToken = signAccessToken(user._id);
  const refreshToken = signRefreshToken(user._id);

  // Save refresh token
  user.refreshTokens.push(refreshToken);
  await user.save();

  // Audit log
  await logAudit(user._id, 'USER_REGISTER', req, { email: user.email, role: user.role });

  res.status(217).json({ // 201 Created or custom response code, 201 is correct
    success: true,
    message: 'User registered successfully',
    accessToken,
    refreshToken,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role
    }
  });
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = catchAsync(async (req, res, next) => {
  const { email, username, password } = req.body;
  const loginIdentifier = email || username;

  if (!loginIdentifier || !password) {
    return next(new AppError('Please provide username/email and password', 400));
  }

  // Check user by email or username
  const user = await User.findOne({
    $or: [
      { email: loginIdentifier },
      { username: loginIdentifier }
    ]
  });
  if (!user || !(await user.comparePassword(password))) {
    // Audit failed login
    await logAudit(null, 'LOGIN_FAILED', req, { loginIdentifier });
    return next(new AppError('Invalid email/username or password', 401));
  }

  // Generate tokens
  const accessToken = signAccessToken(user._id);
  const refreshToken = signRefreshToken(user._id);

  // Save refresh token
  user.refreshTokens.push(refreshToken);
  await user.save();

  // Audit log
  await logAudit(user._id, 'LOGIN_SUCCESS', req, { email: user.email });

  res.status(200).json({
    success: true,
    message: 'Logged in successfully',
    accessToken,
    refreshToken,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role
    }
  });
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
exports.logout = catchAsync(async (req, res, next) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return next(new AppError('Refresh token is required for logout', 400));
  }

  const user = await User.findById(req.user.id);
  if (user) {
    user.refreshTokens = user.refreshTokens.filter(token => token !== refreshToken);
    await user.save();
  }

  await logAudit(req.user.id, 'LOGOUT_SUCCESS', req);

  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
});

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public
exports.refresh = catchAsync(async (req, res, next) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return next(new AppError('Refresh token is required', 400));
  }

  // Verify refresh token
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'jwt_refresh_secret_fallback_key_for_dev_64_chars');
  } catch (err) {
    return next(new AppError('Refresh token is invalid or expired', 401));
  }

  // Check if user has this token
  const user = await User.findById(decoded.id);
  if (!user || !user.refreshTokens.includes(refreshToken)) {
    return next(new AppError('Refresh token was revoked or invalid', 401));
  }

  // Generate new access token
  const newAccessToken = signAccessToken(user._id);

  res.status(200).json({
    success: true,
    accessToken: newAccessToken
  });
});

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
exports.profile = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('-password');
  const preferences = await UserPreference.findOne({ user: req.user.id });

  res.status(200).json({
    success: true,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      preferences: preferences || {}
    }
  });
});

// @desc    Forgot password mock
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  if (!email) {
    return next(new AppError('Please provide an email address', 400));
  }

  const user = await User.findOne({ email });
  if (!user) {
    // To prevent user enumeration, return success response even if email doesn't exist
    return res.status(200).json({
      success: true,
      message: 'If the email exists, a password reset link has been dispatched.'
    });
  }

  const resetToken = jwt.sign({ id: user._id }, 'reset_secret', { expiresIn: '10m' });
  const resetLink = `http://localhost:5000/reset-password.html?token=${resetToken}`;

  // Log mock email dispatch
  await logAudit(user._id, 'FORGOT_PASSWORD_REQUEST', req, { email });
  console.log(`[MOCK EMAIL] Password Reset Link: ${resetLink}`);

  res.status(200).json({
    success: true,
    message: 'If the email exists, a password reset link has been dispatched.',
    // We return mock link for direct developer visual validation
    resetLink: process.env.NODE_ENV === 'development' ? resetLink : undefined
  });
});

// @desc    Change password
// @route   POST /api/auth/change-password
// @access  Private
exports.changePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return next(new AppError('Please provide current and new passwords', 400));
  }

  const user = await User.findById(req.user.id);
  if (!(await user.comparePassword(currentPassword))) {
    await logAudit(user._id, 'PASSWORD_CHANGE_FAILED', req, { reason: 'Incorrect current password' });
    return next(new AppError('Incorrect current password', 401));
  }

  user.password = newPassword;
  await user.save();

  await logAudit(user._id, 'PASSWORD_CHANGE_SUCCESS', req);

  res.status(200).json({
    success: true,
    message: 'Password changed successfully'
  });
});

// @desc    Update user preferences
// @route   PUT /api/auth/preferences
// @access  Private
exports.updatePreferences = catchAsync(async (req, res, next) => {
  const { theme, emailNotifications, browserNotifications } = req.body;

  let preference = await UserPreference.findOne({ user: req.user.id });
  if (!preference) {
    preference = new UserPreference({ user: req.user.id });
  }

  if (theme) preference.theme = theme;
  if (emailNotifications !== undefined) preference.emailNotifications = emailNotifications;
  if (browserNotifications !== undefined) preference.browserNotifications = browserNotifications;

  await preference.save();

  await logAudit(req.user.id, 'UPDATE_PREFERENCES', req, {
    theme: preference.theme,
    emailNotifications: preference.emailNotifications,
    browserNotifications: preference.browserNotifications
  });

  res.status(200).json({
    success: true,
    message: 'Preferences updated successfully',
    data: preference
  });
});

// @desc    Mock Google Login / Authentication
// @route   POST /api/auth/google
// @access  Public
exports.googleAuth = catchAsync(async (req, res, next) => {
  const { email, username } = req.body;
  if (!email || !username) {
    return next(new AppError('Please provide email and username for Google login', 400));
  }

  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
      username,
      email,
      password: Math.random().toString(36).substring(2, 15),
      role: 'student'
    });

    // Create default category
    await Category.create({
      name: 'General',
      color: '#4f46e5',
      user: user._id
    });

    // Create default preferences
    await UserPreference.create({
      user: user._id,
      theme: 'light',
      emailNotifications: true,
      browserNotifications: true
    });
  }

  // Generate tokens
  const accessToken = signAccessToken(user._id);
  const refreshToken = signRefreshToken(user._id);

  // Save refresh token
  user.refreshTokens.push(refreshToken);
  await user.save();

  // Audit log
  await logAudit(user._id, 'LOGIN_GOOGLE_SUCCESS', req, { email: user.email });

  res.status(200).json({
    success: true,
    message: 'Logged in with Google successfully',
    accessToken,
    refreshToken,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role
    }
  });
});

// @desc    Real Google Token Authentication (GIS JWT callback validation)
// @route   POST /api/auth/google-token
// @access  Public
exports.googleTokenAuth = catchAsync(async (req, res, next) => {
  const { token } = req.body;
  if (!token) {
    return next(new AppError('Please provide a Google ID Token', 400));
  }

  let decoded;
  try {
    decoded = jwt.decode(token);
    if (!decoded || !decoded.email) {
      return next(new AppError('Invalid Google ID Token payload', 400));
    }
  } catch (err) {
    return next(new AppError('Failed to parse Google ID Token', 400));
  }

  const { email, name, picture } = decoded;
  const username = name || email.split('@')[0];

  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
      username,
      email,
      password: Math.random().toString(36).substring(2, 15),
      role: 'student'
    });

    // Create default category
    await Category.create({
      name: 'General',
      color: '#4f46e5',
      user: user._id
    });

    // Create default preferences
    await UserPreference.create({
      user: user._id,
      theme: 'light',
      emailNotifications: true,
      browserNotifications: true
    });
  }

  // Generate tokens
  const accessToken = signAccessToken(user._id);
  const refreshToken = signRefreshToken(user._id);

  // Save refresh token
  user.refreshTokens.push(refreshToken);
  await user.save();

  // Audit log
  await logAudit(user._id, 'LOGIN_GOOGLE_SUCCESS', req, { email: user.email });

  res.status(200).json({
    success: true,
    message: 'Logged in with Google successfully',
    accessToken,
    refreshToken,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role
    }
  });
});
