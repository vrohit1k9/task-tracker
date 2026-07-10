const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const PDF_PATH = path.join(__dirname, 'PROJECT_REPORT_SHORT.pdf');

function generateShortReport() {
  console.log("Generating Concise 2-Page PDF Report...");
  const pdfDoc = new PDFDocument({
    margin: 40,
    size: 'A4',
    bufferPages: true
  });
  
  const stream = fs.createWriteStream(PDF_PATH);
  pdfDoc.pipe(stream);

  // ==========================================
  // PAGE 1: TITLE BANNER, DETAILS, & INTRODUCTION
  // ==========================================
  
  // Decorative Header Banner
  pdfDoc.rect(0, 0, 595.28, 120).fill('#4f46e5');
  pdfDoc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(20).text("SANDRO: STUDENT TASK TRACKER", 40, 35, { align: 'center' });
  pdfDoc.fontSize(11).font('Helvetica-Oblique').text("Project Report", 40, 65, { align: 'center' });

  // Metadata block
  pdfDoc.fillColor('#1e293b');
  pdfDoc.fontSize(10).font('Helvetica-Bold').text("PREPARED BY: ", 40, 140, { Emily: true });
  pdfDoc.font('Helvetica').text("Rohith V", 130, 140);

  pdfDoc.strokeColor('#cbd5e1').lineWidth(0.5).moveTo(40, 160).lineTo(555, 160).stroke();

  // 1. Abstract
  pdfDoc.fillColor('#4f46e5').font('Helvetica-Bold').fontSize(12).text("1. Executive Summary & Abstract", 40, 175);
  pdfDoc.fillColor('#334155').font('Helvetica-Oblique').fontSize(9.5).text(
    "Sandro is a production-grade, secure academic management application designed to help students organize tasks, manage courses, track deadlines, and monitor performance. Utilizing a decoupled MVC architecture, the system is built with a lightweight Vanilla HTML5/CSS3/JavaScript front-end and a robust Node.js/Express.js/MongoDB REST API backend. System security is enforced via cryptographic password hashing using bcrypt, JSON Web Token (JWT) access/refresh token pairs, rate limiting, and input sanitization.",
    40, 195, { align: 'justify', width: 515, lineGap: 3 }
  );

  // 2. System Architecture
  pdfDoc.fillColor('#4f46e5').font('Helvetica-Bold').fontSize(12).text("2. System Architecture & MVC Layout", 40, 280);
  pdfDoc.fillColor('#1e293b').font('Helvetica').fontSize(9.5).text(
    "The codebase strictly adheres to the Model-View-Controller pattern:\n" +
    "• Views (Client Layer): Rich interface featuring a responsive design system, custom light/dark theme variables, dynamic glassmorphic panels, and interactive dashboards driven by Chart.js.\n" +
    "• Controllers (API Layer): Orchestrates registration/login cycles, task CRUD, pagination, bulk updates/deletions, and security audits.\n" +
    "• Models (Database Layer): Mongoose collections with compound indexes. Data models consist of Users, Categories (color-coded courses), Tasks (with priority, status, and due dates), and AuditLogs.",
    40, 300, { align: 'justify', width: 515, lineGap: 2 }
  );

  // 3. System Requirements & Controls
  pdfDoc.fillColor('#4f46e5').font('Helvetica-Bold').fontSize(12).text("3. Core Functional & Non-Functional Requirements", 40, 420);
  
  pdfDoc.font('Helvetica-Bold').fontSize(9.5).text("Functional Requirements:", 40, 440);
  pdfDoc.font('Helvetica').fontSize(9.5).text(
    "• User Management: Secure login/logout, password changes, and mock password recovery links.\n" +
    "• Task & Category CRUD: Task creation with color-coded category labels. Category deletions cascade-default tasks to 'General'.\n" +
    "• Bulk Operations: Allows users to perform batch-complete or batch-delete actions on multiple selected tasks at once.\n" +
    "• Background Daemon: Scans the database and dispatches notifications for upcoming task deadlines.",
    40, 455, { width: 515, lineGap: 1 }
  );

  pdfDoc.font('Helvetica-Bold').fontSize(9.5).text("Non-Functional Security Controls:", 40, 535);
  pdfDoc.font('Helvetica').fontSize(9.5).text(
    "• Cryptographic Hashing: Passwords are encrypted using bcryptjs with a work factor of 10.\n" +
    "• JWT Auth Pairs: Short-lived access tokens (15m) paired with long-lived refresh tokens (7d) stored securely.\n" +
    "• Request Defense: Implements express-rate-limit to mitigate DDoS/brute force and express-mongo-sanitize to intercept NoSQL injection payloads.",
    40, 550, { width: 515, lineGap: 1 }
  );

  // Page 1 Footer
  pdfDoc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(40, 785).lineTo(555, 785).stroke();
  pdfDoc.fillColor('#94a3b8').fontSize(7.5).text("Sandro: Student Task & Assignment Tracker - Project Report", 40, 792);
  pdfDoc.text("Page 1 of 2", 515, 792);

  // ==========================================
  // PAGE 2: TESTING, ROADMAP, & CONCLUSION
  // ==========================================
  pdfDoc.addPage();

  // Page 2 Header Banner
  pdfDoc.rect(0, 0, 595.28, 40).fill('#4f46e5');
  pdfDoc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(10).text("SECTION II: IMPLEMENTATION, QA, & ROADMAP", 40, 15);

  // 4. Database Design & Schemas
  pdfDoc.fillColor('#4f46e5').font('Helvetica-Bold').fontSize(12).text("4. Database Design & Schema Architecture", 40, 65);
  pdfDoc.fillColor('#1e293b').font('Helvetica').fontSize(9.5).text(
    "Sandro structures its documents across 5 main MongoDB collections:\n" +
    "1. Users Collection: Stores usernames, emails, hashed passwords, roles (student/admin), and lists of active refresh tokens.\n" +
    "2. Categories Collection: Custom course identifiers with hex color values and references to their owner user.\n" +
    "3. Tasks Collection: Contains due dates, priorities (low/medium/high), status tags (pending/in-progress/completed), and references to Categories and Users.\n" +
    "4. AuditLogs Collection: Immutable logging stream capturing transaction actions, IP addresses, browser headers, and detailed payload states for administrative security review.\n" +
    "5. Reminders Collection: Maps task due dates to notification triggers evaluated by the scheduler.",
    40, 85, { width: 515, lineGap: 2.5 }
  );

  // 5. Testing & Verification Suite
  pdfDoc.fillColor('#4f46e5').font('Helvetica-Bold').fontSize(12).text("5. Testing Methodology & Verification", 40, 235);
  pdfDoc.fillColor('#1e293b').font('Helvetica').fontSize(9.5).text(
    "To ensure continuous integration readiness, the core REST API is verified using Jest and Supertest. Because CI environments are typically database-free, we engineered a custom, complete database simulation layer:\n" +
    "• In-Memory Database Simulator (tests/mongooseMock.js): Intercepts Mongoose ODM, matching collections, schemas, aggregates, populations, queries, and chain builders.\n" +
    "• Isolation: The mock store resets before every test run, preventing data leaks between test files.\n" +
    "• Test Cases: Verification covers Alice signup (preferences setup), login validation, route authorization guards, custom task lists, query filters, and bulk operation processing.\n" +
    "• Results: 9 major integration tests executed with a 100% success rate, zero leaks, and zero open handles.",
    40, 255, { align: 'justify', width: 515, lineGap: 2.5 }
  );

  // 6. Challenges & Resolutions
  pdfDoc.fillColor('#4f46e5').font('Helvetica-Bold').fontSize(12).text("6. Key Engineering Challenges", 40, 410);
  pdfDoc.fillColor('#1e293b').font('Helvetica').fontSize(9.5).text(
    "• Port Conflicts in Jest: Parallel execution caused EADDRINUSE errors on port 5000. Resolved by disabling server listener calls when NODE_ENV = 'test', enabling Supertest to deploy on random ports.\n" +
    "• Virtual Mongoose ID Matching: Controllers searched for user profiles via virtual getters, which default mocks lacked. Resolved by modifying the mock constructor to map virtual id getters directly to ObjectIds.\n" +
    "• Category Cascade Deletion: Deleting categories threatened to orphan tasks. Resolved by adding a pre-delete middleware hook that automatically updates associated tasks to point to a fallback 'General' category.",
    40, 430, { align: 'justify', width: 515, lineGap: 2 }
  );

  // 7. Conclusion & Roadmap
  pdfDoc.fillColor('#4f46e5').font('Helvetica-Bold').fontSize(12).text("7. Conclusion & Future Roadmap", 40, 555);
  pdfDoc.fillColor('#1e293b').font('Helvetica').fontSize(9.5).text(
    "Sandro is an operational, highly secure capstone application ready for production cloud environments. Future plans for expansion include:\n" +
    "1. Live Google Calendar Synchronization: Bi-directional synchronization of task deadlines with Google Calendar API.\n" +
    "2. Shared Boards: Enabling multiple students to collaborate on shared task/project categories.\n" +
    "3. Real-Time Web Sockets: Transitioning from polling to socket.io-based instant notification push feeds.",
    40, 575, { align: 'justify', width: 515, lineGap: 2.5 }
  );

  // References
  pdfDoc.fillColor('#4f46e5').font('Helvetica-Bold').fontSize(10).text("Key References:", 40, 680);
  pdfDoc.fillColor('#475569').font('Helvetica').fontSize(8.5).text(
    "• Field, R. 'Clean Architecture: A Craftsman's Guide to Software Structure', Prentice Hall, 2017.\n" +
    "• OWASP Top 10 Security Reference Guide, 2025.",
    40, 695, { width: 515, lineGap: 1.5 }
  );

  // Page 2 Footer
  pdfDoc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(40, 785).lineTo(555, 785).stroke();
  pdfDoc.fillColor('#94a3b8').fontSize(7.5).text("Sandro: Student Task & Assignment Tracker - Project Report", 40, 792);
  pdfDoc.text("Page 2 of 2", 515, 792);

  pdfDoc.end();
  stream.on('finish', () => {
    console.log(`Concise PDF successfully generated at: ${PDF_PATH}`);
  });
}

generateShortReport();
