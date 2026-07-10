const mongoose = require('mongoose');
const User = require('../models/User');
const Category = require('../models/Category');
const Task = require('../models/Task');
const UserPreference = require('../models/UserPreference');
const Notification = require('../models/Notification');
const Reminder = require('../models/Reminder');
const AuditLog = require('../models/AuditLog');
const dotenv = require('dotenv');

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/student-task-tracker';

const seedData = async () => {
  try {
    console.log('Connecting to database for seeding...');
    await mongoose.connect(MONGO_URI);
    console.log('Database connected successfully.');

    // 1. Purge Existing Database Records
    console.log('Purging existing data...');
    await User.deleteMany({});
    await Category.deleteMany({});
    await Task.deleteMany({});
    await UserPreference.deleteMany({});
    await Notification.deleteMany({});
    await Reminder.deleteMany({});
    await AuditLog.deleteMany({});
    console.log('Database clean.');

    // 2. Create Users
    console.log('Seeding users...');
    
    // Admin / Professor user
    const adminUser = await User.create({
      username: 'ProfSmith',
      email: 'admin@school.edu',
      password: 'adminpassword123',
      role: 'admin'
    });

    // Student users
    const student1 = await User.create({
      username: 'AliceCurry',
      email: 'alice@school.edu',
      password: 'studentpassword123',
      role: 'student'
    });

    const student2 = await User.create({
      username: 'BobMiller',
      email: 'bob@school.edu',
      password: 'studentpassword123',
      role: 'student'
    });

    console.log('Users seeded successfully.');

    // 3. Create Categories for Student 1
    console.log('Seeding categories for Alice...');
    
    const catGeneral = await Category.create({ name: 'General', color: '#4f46e5', user: student1._id });
    const catExam = await Category.create({ name: 'Exams & Quizzes', color: '#ef4444', user: student1._id });
    const catHomework = await Category.create({ name: 'Homework', color: '#f59e0b', user: student1._id });
    const catProject = await Category.create({ name: 'Term Projects', color: '#10b981', user: student1._id });

    // Seed General categories for Bob
    await Category.create({ name: 'General', color: '#4f46e5', user: student2._id });
    await Category.create({ name: 'General', color: '#4f46e5', user: adminUser._id });

    // 4. Create User Preferences
    console.log('Seeding preferences...');
    await UserPreference.create({
      user: student1._id,
      theme: 'dark',
      emailNotifications: true,
      browserNotifications: true
    });
    await UserPreference.create({
      user: student2._id,
      theme: 'light',
      emailNotifications: true,
      browserNotifications: false
    });
    await UserPreference.create({
      user: adminUser._id,
      theme: 'light',
      emailNotifications: false,
      browserNotifications: false
    });

    // 5. Create Tasks for Alice
    console.log('Seeding tasks for Alice...');
    
    const now = new Date();
    
    // Past task (completed)
    const task1 = await Task.create({
      title: 'Submit Chemistry Essay',
      description: 'Write 3 pages on organic chemical reactions.',
      dueDate: new Date(now.getTime() - 2 * 86400000), // 2 days ago
      priority: 'high',
      status: 'completed',
      category: catHomework._id,
      user: student1._id
    });

    // Current pending tasks
    const task2 = await Task.create({
      title: 'Math Calculus Exam',
      description: 'Prepare chapters 3 through 7. Focus on integration.',
      dueDate: new Date(now.getTime() + 1 * 86400000), // tomorrow
      priority: 'high',
      status: 'pending',
      category: catExam._id,
      user: student1._id
    });

    const task3 = await Task.create({
      title: 'Physics Lab Report',
      description: 'Complete pendulum velocity curves graph sheet.',
      dueDate: new Date(now.getTime() + 3 * 86400000), // 3 days from now
      priority: 'medium',
      status: 'in-progress',
      category: catHomework._id,
      user: student1._id
    });

    // Overdue pending task
    const task4 = await Task.create({
      title: 'English Reading Assignment',
      description: 'Read Act 3 of Macbeth.',
      dueDate: new Date(now.getTime() - 1 * 86400000), // 1 day ago
      priority: 'low',
      status: 'pending',
      category: catHomework._id,
      user: student1._id
    });

    const task5 = await Task.create({
      title: 'Computer Science Final Project',
      description: 'Implement Express REST backend server layout.',
      dueDate: new Date(now.getTime() + 10 * 86400000), // 10 days from now
      priority: 'high',
      status: 'pending',
      category: catProject._id,
      user: student1._id
    });

    console.log('Tasks seeded successfully.');

    // 6. Seed Reminders
    console.log('Seeding reminders...');
    await Reminder.create({
      task: task2._id,
      user: student1._id,
      remindAt: new Date(now.getTime() + 4 * 3600000), // 4 hours from now
      sent: false
    });
    
    // 7. Seed Notifications
    console.log('Seeding notifications...');
    await Notification.create({
      user: student1._id,
      type: 'system',
      message: 'Welcome to Sandro! Get started by adding study tasks.',
      read: true
    });
    await Notification.create({
      user: student1._id,
      type: 'browser',
      message: 'Reminder: English Reading Assignment is now overdue.',
      read: false
    });

    // 8. Seed Audit Logs
    console.log('Seeding security & login audit logs...');
    await AuditLog.create({
      user: student1._id,
      action: 'USER_REGISTER',
      ipAddress: '127.0.0.1',
      details: { email: student1.email },
      timestamp: new Date(now.getTime() - 3 * 86400000)
    });
    await AuditLog.create({
      user: student1._id,
      action: 'LOGIN_SUCCESS',
      ipAddress: '127.0.0.1',
      details: { email: student1.email },
      timestamp: new Date(now.getTime() - 2 * 86400000)
    });

    console.log('Database seeding successfully finished.');
    if (require.main === module) {
      process.exit(0);
    }
  } catch (error) {
    console.error('Error seeding database: ', error);
    if (require.main === module) {
      process.exit(1);
    }
    throw error;
  }
};

if (require.main === module) {
  seedData();
}

module.exports = seedData;
