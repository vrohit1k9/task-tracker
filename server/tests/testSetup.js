// Establish Mongoose global Mock
jest.mock('mongoose', () => require('./mongooseMock'));

const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

// Enforce test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_token_longer_key_32_chars';
process.env.JWT_REFRESH_SECRET = 'test_jwt_refresh_secret_token_longer_key_64_chars';
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/student-task-tracker-test';

beforeEach(() => {
  // Reset mock database states
  mongoose.clearDbStore();
});
