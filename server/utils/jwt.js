const jwt = require('jsonwebtoken');

const signAccessToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET || 'jwt_secret_fallback_key_for_dev_32_chars',
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' }
  );
};

const signRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET || 'jwt_refresh_secret_fallback_key_for_dev_64_chars',
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
};

module.exports = {
  signAccessToken,
  signRefreshToken
};
