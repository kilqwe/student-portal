📚 Academic Portal
⚠️ Note: The Project repository is currently private due to privacy and security considerations, as the system is still under deployment with sensitive student/faculty data. Access can be granted on request.

🔑 Overview
The Academic Portal is a full-stack, role-based academic management system built on Firebase, Node.js, and React, designed to streamline communication, student management, and reporting for educational institutions. It integrates real-time Firestore database operations, role-specific dashboards, bulk imports/exports, and cloud-based APIs to ensure scalability and efficiency.

This portal is actively being developed as a production-ready solution, with cloud-hosted APIs (Render) and email notifications (SendGrid) for uninterrupted real-time operation.

🎯 Key Features
🔐 Role-Based Dashboards
Student Dashboard

View subject assignments, marks, and notifications
Download reports (PDF format)
Access course materials uploaded by faculty
Faculty Dashboard

Manage assigned subjects and students
Upload assignments, enter marks, and generate student reports
Send real-time notifications via integrated email API
Automated report generation using jsPDF
Admin Dashboard

Full system control with role-based access enforcement
Add/manage students, faculty, and subjects
Assign teachers to subjects and monitor academic progress
Configure role divisions dynamically through scripts
📩 Email & Notification System (SendGrid)
Integrated with SendGrid API for transactional and bulk email notifications
Used by faculty/admin to send announcements, assignments, or reminders
Ensures reliable delivery at scale with cloud-level uptime
Custom templating for personalized communication
📊 Reporting & Data Management
Automated PDF report generation using jsPDF + jspdf-autotable

Export student marks, attendance, and internal evaluation reports

Bulk data import/export using Node.js scripts for:

Students (Stud.json)
Teachers (teachers.json)
Subjects (subjects.json)
Marks (marks_data.json)
🛠️ Tech Stack
Frontend

React.js with role-based routing
TailwindCSS for clean, responsive UI
Component-driven design with reusable views
Backend & Database

Firebase Authentication → Secure sign-in for Students, Faculty, Admins
Firestore Database → Real-time, structured data storage
Firebase Storage → For assignment and document uploads
Cloud Functions (Node.js) → Scripts for automation, data seeding, role division
APIs & Cloud Integrations

SendGrid API → Scalable, cloud-grade transactional emails
Render Cloud Hosting → Continuous backend deployment & API uptime
jsPDF + jspdf-autotable → PDF report automation
Other Utilities

Firestore Rules & Indexes → Enforced access security
Bulk Import Scripts → Automating user & marks onboarding
Role Division Scripts → Ensuring RBAC (Role-Based Access Control)
📂 Project Structure
firebase/
│── public/                 # Frontend static assets
│── src/                    # React components
│   ├── components/
│   │   ├── Student/        # Student dashboard views
│   │   ├── Teacher/        # Faculty dashboard views
│   │   ├── Admin/          # Admin dashboard views
│   │   └── Shared/         # Reusable UI components
│
│── scripts/                # Node.js scripts for automation
│   ├── import.js           # Bulk import of student data
│   ├── importteachers.js   # Faculty onboarding
│   ├── imprtsubject.js     # Subject onboarding
│   ├── importmarks.js      # Marks upload
│   ├── assigntectosub.js   # Assign faculty to subjects
│   ├── rolediv.js          # Role-based access setup
│   └── updateuid.js        # Sync/update UIDs
│
│── data/                   # JSON datasets
│   ├── Stud.json
│   ├── teachers.json
│   ├── subjects.json
│   └── marks_data.json
│
│── firebase.json           # Firebase hosting config
│── firestore.rules         # Firestore security rules
│── firestore.indexes.json  # Firestore indexes
│── package.json            # Dependencies & scripts
│── interface.jpg           # UI preview/mockup
🚀 Deployment
Backend APIs → Continuously running on Render
Emails → Powered by SendGrid API
Database → Google Firestore (Realtime NoSQL)
This ensures real-time sync, high availability, and continuous delivery.

🛡️ Security & Privacy
Role-based authentication with Firebase
Enforced Firestore security rules & indexes
API keys and service credentials managed securely with environment variables
Repository kept private during development to safeguard sensitive academic data
GDPR-compliant practices considered for user data handling
🧑‍💻 Installation & Setup (Developer Guide)
Prerequisites
Node.js (v16+)
Firebase CLI
SendGrid API Key
Render account (for backend hosting)
Steps
Clone the repo (access required):

git clone https://github.com/Neharangdal/student-email-backend
cd academic-portal
Install dependencies:

npm install
Configure environment variables:

FIREBASE_API_KEY=your_api_key
FIREBASE_PROJECT_ID=your_project_id
SENDGRID_API_KEY=your_sendgrid_key
Run locally:

npm start
Deploy:

firebase deploy
📈 Use Cases & Benefits
✔ Students → Easy access to marks, assignments, and notifications ✔ Faculty → Efficient class management, assignment uploads, real-time student reports ✔ Admins → Full academic governance with secure dashboards ✔ Institutions → Reduced paperwork, automated reports, cloud reliability ✔ Scalability → Can handle multiple departments, courses, and thousands of students

🔮 Future Enhancements
📊 Analytics Dashboard – AI-based performance prediction for students
🧠 Smart Attendance Tracking – Face recognition & biometric integration
📱 Mobile App – Flutter-based companion app for students/faculty
🔔 Push Notifications – Real-time mobile/desktop alerts
🌐 Multi-Language Support – Accessibility for diverse regions
🧾 Fee Management Module – Secure fee payments & receipts
📑 Advanced Reporting – Semester-wise analysis, ranking, and predictive grading
👩‍💻 Authors
Neha Dinesh Rangdal – neharangdal.04@gmail.com
Pravardhan Prasad – pravardhan35@gmail.com
📌 Status
⏳ Currently in deployment phase. The repository is private due to sensitive data and API keys. Access may be granted on request.

📜 License
This project is intended for academic and deployment purposes. All rights reserved by the authors.