require('./testSetup');
const request = require('supertest');
const app = require('../server');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

describe('Authentication API Endpoint Tests', () => {
  const testUser = {
    username: 'teststudent',
    email: 'teststudent@school.edu',
    password: 'password123',
    role: 'student'
  };

  test('POST /api/auth/register - Should register a new user successfully and create defaults', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(res.status).toBe(217); // 217 registered
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.user.username).toBe(testUser.username);

    // Verify DB user entry
    const userInDb = await User.findOne({ email: testUser.email });
    expect(userInDb).toBeDefined();
    expect(userInDb.role).toBe('student');

    // Verify AuditLog creation
    const logs = await AuditLog.find({ user: userInDb._id });
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].action).toBe('USER_REGISTER');
  });

  test('POST /api/auth/register - Should block registrations with duplicate emails', async () => {
    // Register first user
    await request(app).post('/api/auth/register').send(testUser);
    
    // Register second user with same email
    const res = await request(app).post('/api/auth/register').send(testUser);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Email already registered');
  });

  test('POST /api/auth/login - Should authenticate successfully with correct credentials', async () => {
    // Register user first
    await request(app).post('/api/auth/register').send(testUser);

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body.user.email).toBe(testUser.email);
  });

  test('POST /api/auth/login - Should reject authentication with wrong credentials', async () => {
    await request(app).post('/api/auth/register').send(testUser);

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'wrongpassword'
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Invalid email/username or password');
  });

  test('GET /api/auth/profile - Should block request without a JWT token', async () => {
    const res = await request(app).get('/api/auth/profile');
    expect(res.status).toBe(401);
  });
});
