# Student Task & Assignment Tracker

A premium, secure, and production-ready academic project builder designed for students to track tasks and assignments, manage courses, monitor completion statistics, and configure deadlines.

Built following the **MVC (Model-View-Controller)** pattern with a vanilla HTML5/CSS3/JavaScript client and a Node.js/Express.js/MongoDB backend.

---

## 🌟 Key Features

*   **Premium Visuals:** Custom CSS dark/light theme, modern typography, glassmorphism UI components, dynamic transition animations, and interactive toast alerts.
*   **Role-Based Security:** Strict role-based namespaces for `student` and `admin` users using secure JWT access/refresh token pairs and bcrypt password hashing.
*   **Advanced Analytics:** Real-time statistics, deadline lists, and weekly charts powered by Chart.js.
*   **Categories Management:** CRUD board to manage color-coded categories with automatic default routing (to a "General" category).
*   **Bulk Operations:** Perform batch updates (mark complete) or batch deletions on multiple tasks at once.
*   **Audit Logger:** Immutable system-wide logger tracking every API operation, login, and authorization event.
*   **Automatic Scheduler:** Background daemon daemon scanning for approaching tasks to dispatch notifications.
*   **Docker Ready:** Configured container structures for automated deployment.
*   **Automated Tests:** 100% database-free integration test suites running under Jest.

---

## 📁 Project Structure

```
student-task-tracker/
├── client/                     # Frontend Client Application
│   ├── css/style.css           # Premium stylesheet
│   ├── js/                     # API wrappers, Auth route guards, & UI controllers
│   ├── index.html              # Landing, Signup, Login page
│   ├── dashboard.html          # Analytics charts & recent activities
│   ├── tasks.html              # Task & Course categories board
│   ├── profile.html            # Profile, Password, Theme toggling
│   └── admin.html              # Administrator global console
├── database/
│   └── seed.js                 # Sample database data seeding script
├── docs/
│   ├── API_DOCUMENTATION.md    # REST API endpoints & payload formats
│   ├── ARCHITECTURE.md         # Diagrams (ER, Sequence, Class, DFD) & structures
│   └── TESTING_REPORT.md       # Quality testing methodology & execution logs
├── server/                     # Backend Node.js REST Engine
│   ├── config/db.js            # MongoDB ODM connection
│   ├── controllers/            # Controller logic (Auth, Tasks, Analytics, Admin, etc.)
│   ├── middleware/             # Authorization, Error, Rate limiting & Sanitization
│   ├── models/                 # Mongoose schemas & indexing rules
│   ├── routes/                 # Express Router configuration
│   ├── services/               # Background task scheduler alert daemon
│   ├── utils/                  # Centralized logger, AppError, jwt utilities
│   └── server.js               # Express entry configuration
├── tests/                      # Testing directory
│   ├── testSetup.js            # Environment initialization and mock hooks
│   ├── mongooseMock.js         # Custom mock database connection engine
│   ├── auth.test.js            # Auth endpoints tests
│   └── task.test.js            # Task boards and bulk operation tests
├── Dockerfile                  # Application build specifications
├── docker-compose.yml          # Container configuration
└── .env.example                # Configuration parameters template
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
*   Node.js (v18+) and npm
*   MongoDB running locally (port 27017) OR Docker

### 2. Manual Installation
1.  **Clone the directory** and navigate to the project folder.
2.  **Install project dependencies:**
    ```bash
    npm install
    ```
3.  **Setup Environment:**
    Copy `.env.example` to `.env` and fill out variables:
    ```bash
    cp .env.example .env
    ```
4.  **Seed Database (Optional):**
    Run the database seed script to populate mock assignments, categories, and audit streams:
    ```bash
    npm run seed
    ```
5.  **Start application:**
    ```bash
    npm start
    ```
    *The API server will listen on `http://localhost:5000`.*
6.  **Open Frontend:**
    Open `client/index.html` directly in your web browser.

---

## 🐳 Docker Deployment

To spin up the Node.js API container and a MongoDB database container automatically:
```bash
docker-compose up --build
```
This maps the REST API server to `http://localhost:5000`.

---

## 🧪 Testing Suite

To execute the Jest automated integration test suites:
```bash
npm run test
```
*Note: The test suite uses a custom Mongoose mock (`tests/mongooseMock.js`) which runs 100% database-free, so you do not need MongoDB running to run tests.*

---

## 📚 Technical Documentation

For detailed guides, please refer to the files under the `docs` folder:
1.  **REST API Specs:** [docs/API_DOCUMENTATION.md](file:///C:/Users/nayag/.gemini/antigravity-ide/scratch/student-task-tracker/docs/API_DOCUMENTATION.md)
2.  **Architecture & Design:** [docs/ARCHITECTURE.md](file:///C:/Users/nayag/.gemini/antigravity-ide/scratch/student-task-tracker/docs/ARCHITECTURE.md)
3.  **QA & Testing Report:** [docs/TESTING_REPORT.md](file:///C:/Users/nayag/.gemini/antigravity-ide/scratch/student-task-tracker/docs/TESTING_REPORT.md)
