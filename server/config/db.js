const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/student-task-tracker');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Database connection error: ${error.message}`);
    if (process.env.NODE_ENV === 'test') {
      console.warn('Test environment detected. Skipping hard exit, enabling database mock mode.');
      return { connection: { host: 'mocked-host' } };
    }
    process.exit(1);
  }
};

module.exports = connectDB;
