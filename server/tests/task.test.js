require('./testSetup');
const request = require('supertest');
const app = require('../server');
const User = require('../models/User');
const Category = require('../models/Category');
const Task = require('../models/Task');
const reminderScheduler = require('../services/reminderScheduler');

// Stop background scheduler during tests to prevent open handle issues
beforeAll(() => {
  reminderScheduler.stopScheduler();
});

describe('Task and Category CRUD & Bulk Operations API Tests', () => {
  let token;
  let user;
  let category;

  const testUser = {
    username: 'teststudent',
    email: 'teststudent@school.edu',
    password: 'password123',
    role: 'student'
  };

  beforeEach(async () => {
    // Register and get token
    const res = await request(app).post('/api/auth/register').send(testUser);
    token = res.body.accessToken;
    user = await User.findOne({ email: testUser.email });
    
    // Find default category
    category = await Category.findOne({ user: user._id, name: 'General' });
  });

  test('POST /api/categories - Should create a new category', async () => {
    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Homework', color: '#ef4444' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Homework');
    expect(res.body.data.color).toBe('#ef4444');
  });

  test('POST /api/tasks - Should create a task and link it to category', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Math Assignment 1',
        description: 'Complete page 12 exercises',
        dueDate: new Date(Date.now() + 86400000), // tomorrow
        priority: 'high',
        categoryId: category._id
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Math Assignment 1');
    expect(res.body.data.priority).toBe('high');
    expect(res.body.data.category.toString()).toBe(category._id.toString());
  });

  test('GET /api/tasks - Should fetch user tasks with filters', async () => {
    // Seed two tasks
    await Task.create({
      title: 'Task A',
      dueDate: new Date(),
      priority: 'high',
      status: 'pending',
      category: category._id,
      user: user._id
    });
    await Task.create({
      title: 'Task B',
      dueDate: new Date(),
      priority: 'low',
      status: 'completed',
      category: category._id,
      user: user._id
    });

    const res = await request(app)
      .get('/api/tasks?status=pending')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(1);
    expect(res.body.data[0].title).toBe('Task A');
  });

  test('POST /api/tasks/bulk-update - Should update multiple tasks at once', async () => {
    const t1 = await Task.create({
      title: 'Task 1',
      dueDate: new Date(),
      category: category._id,
      user: user._id
    });
    const t2 = await Task.create({
      title: 'Task 2',
      dueDate: new Date(),
      category: category._id,
      user: user._id
    });

    const res = await request(app)
      .post('/api/tasks/bulk-update')
      .set('Authorization', `Bearer ${token}`)
      .send({
        ids: [t1._id, t2._id],
        status: 'completed'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.modifiedCount).toBe(2);

    const checkT1 = await Task.findById(t1._id);
    expect(checkT1.status).toBe('completed');
  });
});
