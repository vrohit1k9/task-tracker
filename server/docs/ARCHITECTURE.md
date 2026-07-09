# Student Task & Assignment Tracker - System Architecture

This document describes the software architecture, design principles, database models, directory structures, and workflows implemented in the **Student Task & Assignment Tracker**.

---

## 1. System Overview & Key Features

The **Student Task & Assignment Tracker** is a premium, secure, and responsive web application designed for students and administrators to manage tasks, assignments, deadlines, categories, reminders, and user notifications.

*   **Role-Based Access Control (RBAC):** Restricts access to standard features for `student` users, and provides user management, audit logs, and global system statistics for `admin` users.
*   **Secure API Design:** Built with Node.js, Express.js, and MongoDB, protected by JWT access and refresh tokens, bcrypt password hashing, CORS, Helmet headers, express-rate-limit, and mongo-sanitize inputs.
*   **Responsive Dashboard:** Visualizes completion analytics using Chart.js, featuring list cards for upcoming deadlines, custom categories, filters, search, sorting, and pagination.
*   **Automatic Scheduler:** Background daemon scans for tasks nearing their deadlines and dispatches notifications.

---

## 2. System Architecture

The application is structured following the **Model-View-Controller (MVC)** design pattern, which decouples the database layer, route management/business logic layer, and client views.

```mermaid
graph TD
    subgraph Client [Frontend Views & Vanilla JS]
        V_Auth["index.html (Auth Interface)"]
        V_Dash["dashboard.html (Dashboard)"]
        V_Tasks["tasks.html (Task Board)"]
        V_Profile["profile.html (Preferences)"]
        V_Admin["admin.html (Admin Console)"]
        API_Client["client/js/api.js (Fetch API & Token Refresh)"]
    end

    subgraph Server [Backend Node.js & Express]
        Router["Express Router (routes/)"]
        Auth_M["Auth Middleware (protect/authorize)"]
        Sec_M["Security Middleware (Helmet/Rate-Limit/Sanitize)"]
        Controllers["Controllers (controllers/)"]
        Scheduler["Reminder Scheduler Daemon"]
    end

    subgraph Database [MongoDB Layer]
        Mongoose["Mongoose ODM (models/)"]
        MongoDB[("MongoDB Database")]
    end

    V_Auth --> API_Client
    V_Dash --> API_Client
    V_Tasks --> API_Client
    V_Profile --> API_Client
    V_Admin --> API_Client

    API_Client -- "REST API (HTTP + JWT)" --> Sec_M
    Sec_M --> Auth_M
    Auth_M --> Router
    Router --> Controllers
    Controllers --> Mongoose
    Mongoose --> MongoDB
    Scheduler --> Mongoose
```

---

## 3. Database Design & Entity-Relationship (ER) Diagram

The system stores data in 7 MongoDB collections with strict schema validations and indexing.

### Entity-Relationship Diagram

```mermaid
erDiagram
    USER ||--o{ TASK : "owns"
    USER ||--o{ CATEGORY : "creates"
    USER ||--o| USER_PREFERENCE : "has"
    USER ||--o{ AUDIT_LOG : "triggers"
    USER ||--o{ NOTIFICATION : "receives"
    USER ||--o{ REMINDER : "configures"
    CATEGORY ||--o{ TASK : "groups"
    TASK ||--o{ REMINDER : "triggers"

    USER {
        ObjectId _id PK
        String username
        String email UK
        String password
        String role
        StringArray refreshTokens
        Date createdAt
        Date updatedAt
    }

    CATEGORY {
        ObjectId _id PK
        String name
        String color
        ObjectId user FK
        Date createdAt
    }

    TASK {
        ObjectId _id PK
        String title
        String description
        Date dueDate
        String priority
        String status
        ObjectId category FK
        ObjectId user FK
        Date createdAt
    }

    USER_PREFERENCE {
        ObjectId _id PK
        ObjectId user FK
        String theme
        Boolean emailNotifications
        Boolean browserNotifications
    }

    NOTIFICATION {
        ObjectId _id PK
        ObjectId user FK
        String title
        String message
        String type
        Boolean isRead
        Date createdAt
    }

    REMINDER {
        ObjectId _id PK
        ObjectId task FK
        ObjectId user FK
        Date remindAt
        Boolean isSent
        Date createdAt
    }

    AUDIT_LOG {
        ObjectId _id PK
        ObjectId user FK
        String action
        String ipAddress
        String userAgent
        Object details
        Date createdAt
    }
```

---

## 4. Class Diagram & Core Models

The class design revolves around Mongoose schemas mapped to Node controller operations.

```mermaid
classDiagram
    class User {
        +ObjectId id
        +String username
        +String email
        +String password
        +String role
        +String[] refreshTokens
        +comparePassword(password) Boolean
    }

    class Category {
        +ObjectId id
        +String name
        +String color
        +ObjectId user
    }

    class Task {
        +ObjectId id
        +String title
        +String description
        +Date dueDate
        +String priority
        +String status
        +ObjectId category
        +ObjectId user
    }

    class UserPreference {
        +ObjectId id
        +ObjectId user
        +String theme
        +Boolean emailNotifications
        +Boolean browserNotifications
    }

    class Notification {
        +ObjectId id
        +ObjectId user
        +String title
        +String message
        +String type
        +Boolean isRead
    }

    class Reminder {
        +ObjectId id
        +ObjectId task
        +ObjectId user
        +Date remindAt
        +Boolean isSent
    }

    class AuditLog {
        +ObjectId id
        +ObjectId user
        +String action
        +String ipAddress
        +String userAgent
        +Object details
    }

    User "1" *-- "0..*" Task
    User "1" *-- "0..*" Category
    User "1" *-- "1" UserPreference
    Category "1" *-- "0..*" Task
    Task "1" *-- "0..*" Reminder
```

---

## 5. Sequence Diagram: Authentication Flow

This diagram illustrates standard registration/login processes, middleware token authorization, and token refreshes.

```mermaid
sequenceDiagram
    autonumber
    actor Student as Student Client
    participant App as Express Application
    participant AuthM as Auth Middleware
    participant JWT as JWT Utility
    participant DB as MongoDB

    Note over Student, DB: Registration Flow
    Student->>App: POST /api/auth/register (username, email, password)
    App->>DB: Check duplicate email
    DB-->>App: None found
    App->>DB: Create User, Default Category ("General"), UserPreference
    DB-->>App: Done
    App->>JWT: signAccessToken(user_id), signRefreshToken(user_id)
    JWT-->>App: Tokens
    App->>DB: Save refreshToken to User model
    DB-->>App: Saved
    App-->>Student: 217 Registered (Tokens & User profile)

    Note over Student, DB: Request Authorization Flow
    Student->>App: GET /api/tasks (Headers: Authorization = Bearer <token>)
    App->>AuthM: Verify Token
    AuthM->>JWT: jwt.verify(token, JWT_SECRET)
    JWT-->>AuthM: Decoded User Payload
    AuthM->>DB: User.findById(decoded.id)
    DB-->>AuthM: User Object
    AuthM->>App: Attach user to req.user
    App->>DB: Fetch tasks for req.user.id
    DB-->>App: Task List
    App-->>Student: 200 OK (Tasks Data)

    Note over Student, DB: Token Expired & Refresh Flow
    Student->>App: GET /api/tasks (Expired Token)
    App->>AuthM: Verify Token
    AuthM->>JWT: jwt.verify(token)
    JWT-->>AuthM: Error: TokenExpiredError
    AuthM-->>Student: 401 Unauthorized (Token has expired)
    Student->>App: POST /api/auth/refresh (refreshToken)
    App->>DB: User.findOne({ refreshTokens: token })
    DB-->>App: User Found
    App->>JWT: signAccessToken(user_id)
    JWT-->>App: New Access Token
    App-->>Student: 200 OK (New Access Token)
```

---

## 6. System Activity & Data Flows

### Data Flow Diagram (DFD Level 1)

```mermaid
graph TD
    UserEntity([Student Client]) -- "1. Form Input Data" --> P_Validation[2. Express Request Validation]
    P_Validation -- "2. Clean Request" --> P_Auth[3. Security & Auth Middleware]
    P_Auth -- "3. Authorized ID" --> P_Controller[4. Controller Operations]
    P_Controller -- "4. Mongoose Queries" --> DB_Store[(MongoDB Collections)]
    DB_Store -- "5. Document/Aggregate Result" --> P_Controller
    P_Controller -- "6. Audit Log Detail" --> P_Logger[5. Audit Logging Service]
    P_Logger --> DB_Store
    P_Controller -- "7. JSON Response Payload" --> UserEntity
```

### Task Life-Cycle Activity Diagram

```mermaid
stateDiagram-v2
    [*] --> Pending : Task Created
    Pending --> InProgress : Start Assignment
    Pending --> Completed : Directly Complete
    InProgress --> Completed : Check off Assignment
    InProgress --> Pending : Reset Task Status
    Completed --> Pending : Mark Incomplete
    Completed --> [*] : Deleted Task
    Pending --> [*] : Deleted Task
    InProgress --> [*] : Deleted Task
```

---

## 7. Folder Structure & MVC Architecture

The codebase has a clean layout following modularity patterns:

```
student-task-tracker/
├── client/                     # Frontend Static Web Server Files
│   ├── css/
│   │   └── style.css           # Premium Glassmorphic design styles
│   ├── js/
│   │   ├── api.js              # Fetch client wrapper & automated refresh
│   │   ├── auth.js             # Route protections & login/signup handlers
│   │   ├── dashboard.js        # Chart.js statistics & deadline cards
│   │   ├── tasks.js            # Task CRUD, Categories board, filters, bulk
│   │   └── admin.js            # Admin user logs and global statistics
│   ├── index.html              # Landing, Login, Signup & Recover Forms
│   ├── dashboard.html          # Analytics Dashboard
│   ├── tasks.html              # Task & Category Management Console
│   ├── profile.html            # User Settings & Preferences
│   └── admin.html              # Admin portal
├── database/
│   └── seed.js                 # Sample database seed script
├── docs/
│   ├── API_DOCUMENTATION.md    # API schema documentation
│   ├── ARCHITECTURE.md         # Architecture flows & diagrams
│   └── TESTING_REPORT.md       # Quality testing & automated run report
├── server/                     # Express.js REST Engine
│   ├── config/
│   │   └── db.js               # MongoDB connection wrapper
│   ├── controllers/
│   │   ├── authController.js   # Registration, logins, profiles, prefs
│   │   ├── taskController.js   # Tasks CRUD, pagination, bulk operations
│   │   ├── categoryController.js # Category CRUD
│   │   ├── reminderController.js # Reminder configurations
│   │   ├── notificationController.js # User notifications
│   │   ├── analyticsController.js # Summary & aggregation pipeline endpoints
│   │   ├── adminController.js  # Global system states, user records
│   │   └── auditController.js  # Security logs, login logs retrieval
│   ├── middleware/
│   │   ├── authMiddleware.js   # Protect routes & RBAC role control
│   │   ├── errorMiddleware.js  # Global Express central error handling
│   │   ├── rateLimiter.js      # Endpoint DDoS and brute force protection
│   │   └── sanitize.js         # XSS html protection & MongoDB injection
│   ├── models/                 # Database Schemas
│   │   ├── User.js
│   │   ├── Category.js
│   │   ├── Task.js
│   │   ├── Notification.js
│   │   ├── Reminder.js
│   │   ├── UserPreference.js
│   │   └── AuditLog.js
│   ├── routes/                 # Express Route Declarations
│   ├── services/
│   │   └── reminderScheduler.js # Automatic Background Deadline Scanner
│   ├── utils/
│   │   ├── appError.js         # Custom extendable Error class
│   │   ├── auditLogger.js      # Global AuditLog storage system helper
│   │   ├── jwt.js              # Access and Refresh sign utility
│   │   └── logger.js           # File and console logger helper
│   └── server.js               # Entry point configuration file
├── tests/                      # Automated Test Suite
│   ├── testSetup.js            # Environment settings and mock hooks
│   ├── mongooseMock.js         # Database-free Mongoose simulation engine
│   ├── auth.test.js            # Authentication endpoints test suite
│   └── task.test.js            # Tasks CRUD, Category & Bulk operations
├── Dockerfile                  # Server Docker Image Specification
├── docker-compose.yml          # Local container composition configuration
├── package.json                # Project script registry and dependencies
└── .env.example                # Sample environment configuration template
```

---

## 8. Deployment Guide

### Prerequisites
*   Node.js (v18+) and npm
*   MongoDB Instance (local or Atlas cluster) OR Docker Installed

### Option A: Local Deployment (Manual)
1.  **Clone code** and change to root directory.
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Setup environment variables:**
    Copy `.env.example` to `.env` and fill out variables:
    ```ini
    PORT=5000
    MONGO_URI=mongodb://localhost:27017/student-task-tracker
    JWT_SECRET=your_32_character_long_secret_key_string
    JWT_REFRESH_SECRET=your_64_character_long_secret_key_string
    JWT_ACCESS_EXPIRE=15m
    JWT_REFRESH_EXPIRE=7d
    ```
4.  **Seed database with dummy data (optional):**
    ```bash
    npm run seed
    ```
5.  **Run backend dev server:**
    ```bash
    npm run dev
    ```
6.  **Open frontend:**
    Serve the `/client` directory with any static server or open `client/index.html` directly in a browser.

### Option B: Docker Container Deployment (Automated)
Build and spin up the backend and a local MongoDB instance automatically:
```bash
docker-compose up --build
```
This binds the API server to `http://localhost:5000` and configures hot-reload folders.

---

## 9. Troubleshooting & Maintenance

### 1. Issue: "JWT Secret must be defined"
*   **Cause:** The application failed to load `.env` variables.
*   **Resolution:** Verify that a `.env` file exists in the project root directory (not `server/` or `client/`) and has variables defined properly.

### 2. Issue: Mock Database Resetting in Jest Tests
*   **Detail:** Jest runs suites in isolation.
*   **Design Choice:** `mongooseMock.js` contains a state reset handler (`mongoose.clearDbStore()`) running `beforeEach` to guarantee data isolation between test cases. This is intentional.

### 3. Issue: Database Connection Failures
*   **Cause:** MongoDB is not running or network firewalls block port `27017`.
*   **Resolution:** Run `mongod` locally or configure the connection string to point to MongoDB Atlas.

---

## 10. Future Enhancements

*   **Google Calendar API Integration:** Sync task deadlines directly to Google Calendars.
*   **Collaborative Tasks:** Allow students to share categories and assign group tasks.
*   **Real-time Push Notifications:** Integrate Socket.io for immediate alerts while the browser is open.
*   **Interactive Attachment Uploads:** Enable students to attach PDFs or images to assignment tasks.
