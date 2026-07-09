# REST API Documentation

This document describes all API endpoints exposed by the Student Task & Assignment Tracker.

All API requests must include the header:
`Content-Type: application/json`

For protected routes, include the JWT token:
`Authorization: Bearer <your_access_token>`

---

## 1. Authentication APIs

### Register User
* **URL:** `/api/auth/register`
* **Method:** `POST`
* **Access:** Public (Rate limited to 30 requests/hour)
* **Request Body:**
```json
{
  "username": "JohnDoe",
  "email": "johndoe@school.edu",
  "password": "securepassword123",
  "role": "student" // or "admin"
}
```
* **Success Response (217 Created):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "eyJhbGciOi...",
  "user": {
    "id": "603d2de8a...",
    "username": "JohnDoe",
    "email": "johndoe@school.edu",
    "role": "student"
  }
}
```

### Login User
* **URL:** `/api/auth/login`
* **Method:** `POST`
* **Access:** Public (Rate limited to 30 requests/hour)
* **Request Body:**
```json
{
  "email": "johndoe@school.edu",
  "password": "securepassword123"
}
```
* **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged in successfully",
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "eyJhbGciOi...",
  "user": {
    "id": "603d2de8a...",
    "username": "JohnDoe",
    "email": "johndoe@school.edu",
    "role": "student"
  }
}
```

### Logout User
* **URL:** `/api/auth/logout`
* **Method:** `POST`
* **Access:** Protected
* **Request Body:**
```json
{
  "refreshToken": "eyJhbGciOi..."
}
```
* **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Refresh Token
* **URL:** `/api/auth/refresh`
* **Method:** `POST`
* **Access:** Public
* **Request Body:**
```json
{
  "refreshToken": "eyJhbGciOi..."
}
```
* **Success Response (200 OK):**
```json
{
  "success": true,
  "accessToken": "eyJhbGciOi..."
}
```

### Get Profile Details
* **URL:** `/api/auth/profile`
* **Method:** `GET`
* **Access:** Protected
* **Success Response (200 OK):**
```json
{
  "success": true,
  "user": {
    "id": "603d2de8a...",
    "username": "JohnDoe",
    "email": "johndoe@school.edu",
    "role": "student",
    "preferences": {
      "theme": "light",
      "emailNotifications": true,
      "browserNotifications": true
    }
  }
}
```

### Update User Preferences
* **URL:** `/api/auth/preferences`
* **Method:** `PUT`
* **Access:** Protected
* **Request Body:**
```json
{
  "theme": "dark",
  "emailNotifications": true,
  "browserNotifications": false
}
```
* **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Preferences updated successfully",
  "data": {
    "theme": "dark",
    "emailNotifications": true,
    "browserNotifications": false
  }
}
```

### Change Password
* **URL:** `/api/auth/change-password`
* **Method:** `POST`
* **Access:** Protected
* **Request Body:**
```json
{
  "currentPassword": "securepassword123",
  "newPassword": "newsecurepassword123"
}
```
* **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

## 2. Task Management APIs

### Get All Tasks
* **URL:** `/api/tasks`
* **Method:** `GET`
* **Access:** Protected
* **Query Parameters:**
  * `page` (default: 1)
  * `limit` (default: 10)
  * `search` (text search in title & description)
  * `status` (`pending`, `in-progress`, `completed`)
  * `priority` (`low`, `medium`, `high`)
  * `category` (category ID)
  * `sortBy` (`dueDate`, `priority`, `createdAt`)
  * `sortOrder` (`asc`, `desc`)
* **Success Response (200 OK):**
```json
{
  "success": true,
  "count": 1,
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "pages": 1
  },
  "data": [
    {
      "_id": "603d2efa2...",
      "title": "Math Homework 2",
      "description": "Complete derivative formulas sheet",
      "dueDate": "2026-06-25T12:00:00.000Z",
      "priority": "medium",
      "status": "pending",
      "category": {
        "_id": "603d2ecd1...",
        "name": "Maths",
        "color": "#ef4444"
      },
      "user": "603d2de8a...",
      "createdAt": "2026-06-20T10:00:00.000Z"
    }
  ]
}
```

### Create Task
* **URL:** `/api/tasks`
* **Method:** `POST`
* **Access:** Protected
* **Request Body:**
```json
{
  "title": "Math Homework 2",
  "description": "Complete derivative formulas sheet",
  "dueDate": "2026-06-25T12:00:00.000Z",
  "priority": "medium",
  "categoryId": "603d2ecd1..."
}
```
* **Success Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "_id": "603d2efa2...",
    "title": "Math Homework 2",
    "description": "Complete derivative formulas sheet",
    "dueDate": "2026-06-25T12:00:00.000Z",
    "priority": "medium",
    "status": "pending",
    "category": "603d2ecd1...",
    "user": "603d2de8a..."
  }
}
```

### Update Task
* **URL:** `/api/tasks/:id`
* **Method:** `PUT`
* **Access:** Protected
* **Request Body:** (Provide only fields to update)
```json
{
  "status": "in-progress",
  "priority": "high"
}
```
* **Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "_id": "603d2efa2...",
    "title": "Math Homework 2",
    "description": "Complete derivative formulas sheet",
    "dueDate": "2026-06-25T12:00:00.000Z",
    "priority": "high",
    "status": "in-progress"
  }
}
```

### Bulk Update Tasks
* **URL:** `/api/tasks/bulk-update`
* **Method:** `POST`
* **Access:** Protected
* **Request Body:**
```json
{
  "ids": ["603d2efa2...", "603d2fbc3..."],
  "status": "completed",
  "priority": "low"
}
```
* **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Successfully updated 2 tasks.",
  "modifiedCount": 2
}
```

### Bulk Delete Tasks
* **URL:** `/api/tasks/bulk-delete`
* **Method:** `POST`
* **Access:** Protected
* **Request Body:**
```json
{
  "ids": ["603d2efa2...", "603d2fbc3..."]
}
```
* **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Successfully deleted 2 tasks.",
  "deletedCount": 2
}
```

---

## 3. Category APIs

### Get Categories
* **URL:** `/api/categories`
* **Method:** `GET`
* **Access:** Protected
* **Success Response (200 OK):**
```json
{
  "success": true,
  "count": 2,
  "data": [
    { "_id": "603d2ecd1...", "name": "General", "color": "#4f46e5" },
    { "_id": "603d2ece2...", "name": "Exams", "color": "#ef4444" }
  ]
}
```

### Create Category
* **URL:** `/api/categories`
* **Method:** `POST`
* **Access:** Protected
* **Request Body:**
```json
{
  "name": "Homework",
  "color": "#f59e0b"
}
```
* **Success Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "_id": "603d2ecf3...",
    "name": "Homework",
    "color": "#f59e0b",
    "user": "603d2de8a..."
  }
}
```

---

## 4. Reminder & Notification APIs

### Get Active Reminders
* **URL:** `/api/reminders`
* **Method:** `GET`
* **Access:** Protected

### Create Reminder
* **URL:** `/api/reminders`
* **Method:** `POST`
* **Access:** Protected
* **Request Body:**
```json
{
  "taskId": "603d2efa2...",
  "remindAt": "2026-06-24T09:00:00.000Z"
}
```

### Get Notifications History
* **URL:** `/api/notifications`
* **Method:** `GET`
* **Access:** Protected

---

## 5. Analytics & Admin Dashboard APIs

### Get Overview Statistics
* **URL:** `/api/analytics/overview`
* **Method:** `GET`
* **Access:** Protected

### Get System stats (Admin only)
* **URL:** `/api/admin/stats`
* **Method:** `GET`
* **Access:** Private (Admin only)

### Get Global Audit Logs (Admin only)
* **URL:** `/api/admin/audit-logs`
* **Method:** `GET`
* **Access:** Private (Admin only)
* **Query Parameters:** `userId`, `action`, `ipAddress`
