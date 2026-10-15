# SmartAttend 📍📱

> **Next-Generation Geofenced & Biometric Classroom Attendance Platform**  
> Built with **React Native (Expo)**, **Node.js (Express)**, **MongoDB Atlas**, and **Supabase Storage**.

---

## 🌟 Overview

**SmartAttend** eliminates proxy attendance and buddy punching in educational and enterprise environments through a multi-factor verification pipeline:
1. **Hardware Biometrics**: Device-level fingerprint / thumbprint / FaceID binding via `expo-local-authentication`.
2. **GPS Geofencing**: High-precision latitude/longitude coordinate validation using the Haversine formula against a teacher-configured radius (1 – 1,000 meters).
3. **Live Camera Selfie Verification**: Real-time photo capture during check-in uploaded securely to Supabase Storage.
4. **Granular Role-Based Access Control (RBAC)**: Distinct permissions for Class Owners, Co-Teachers (with re-assignable permissions), and Enrolled Students.
5. **Interactive Attendance Visualizations**: Monthly calendar heatmap (Present, Absent, Holiday) and real-time attendance registers.

---

## 🚀 Key Features

### 🔐 1. Biometric Binding & Authentication
- **Thumb / Fingerprint Enrollment**: Upon account registration, students and teachers bind their account with their device's native biometric hardware.
- **Biometric Check-In**: Students must authenticate using their enrolled biometric key prior to submitting an attendance claim.
- **Secure Token Storage**: JWT tokens stored securely on-device using `expo-secure-store`.

### 📍 2. Geofenced Classroom Boundaries
- **Configurable Class Geofence**: Class owners and scheduled co-teachers can set custom classroom coordinates or capture live GPS via device location.
- **Radius Meter Validation**: Validated boundary between 1 to 1,000 meters.
- **Haversine Distance Check**: Backend recalculates and verifies device coordinates against class geofence to prevent client-side spoofing.

### 👥 3. Granular Role-Based Access Control (RBAC)
- **Class Owner**: Ultimate authority over the class; can create sessions, configure geofences, enroll students, and appoint co-teachers.
- **Co-Teachers**: Assigned custom subsets of permissions:
  - `MANAGE_MEMBERS`: Add or remove students.
  - `MANAGE_SCHEDULE`: Configure geofence coordinates and schedule class sessions.
  - `MANAGE_ATTENDANCE`: Start/stop sessions and review live student check-ins.
  - *Dynamic Permission Re-Assignment*: Owners can modify co-teacher permissions anytime via dedicated UI modal.
- **Students**: Enrolled into classes, eligible for check-in during active session windows, and view personalized attendance reports.

### ⏱️ 4. Automated Session Lifecycle & Finalization
- **Configurable Attendance Windows**: Teachers define session durations (e.g., 5 to 60 minutes).
- **Automated Expired Session Cron**: Node.js background cron job (`node-cron`) checks every minute and finalizes expired sessions:
  - Any student who did not submit a valid check-in is automatically recorded as `ABSENT`.

### 📅 5. Visual Attendance & Categorization
- **Student Monthly Calendar**: Color-coded view of monthly attendance:
  - 🟢 **Present**: Successful check-in inside the geofence.
  - 🔴 **Absent**: Missed session window.
  - 🟣 **Holiday**: Designated institutional days off.
  - ⚪ **No Class / Inactive**: Days without sessions.
- **Session Categorization**: Classes and sessions separated into **Active Live Sessions**, **Upcoming / Scheduled**, and **Completed / Expired**.

### ⚡ 6. Dual-IP Auto-Failover Network Client
- Seamless switching between development host IPs (e.g., switching between Wi-Fi and mobile hotspots) without app restarts.

---

## 🛠️ Tech Stack

### Frontend (Mobile App)
- **Framework**: [React Native](https://reactnative.dev/) (v0.86) with [Expo SDK 57](https://expo.dev/)
- **UI Engine**: React 19, Vanilla React Native StyleSheet, Custom Design Tokens
- **Vector Graphics**: `react-native-svg` (Theme: Peach `#E07A5F` & Sage Green `#439A72`)
- **Device Sensors & Hardware**:
  - `expo-local-authentication` (Biometrics / Thumbprint)
  - `expo-location` (GPS Coordinates & Geofencing)
  - `expo-camera` (Selfie check-in capture)
  - `expo-secure-store` (Encrypted token persistence)

### Backend (REST API)
- **Runtime**: [Node.js](https://nodejs.org/) (ES Modules)
- **Server Framework**: [Express 5](https://expressjs.com/)
- **Database**: [MongoDB Atlas](https://www.mongodb.com/atlas) with [Mongoose 9](https://mongoosejs.com/)
- **Authentication**: JSON Web Tokens (`jsonwebtoken`) & `bcrypt`
- **File & Media Storage**: [Supabase Storage](https://supabase.com/) (`@supabase/supabase-js`, `multer`)
- **Task Scheduling**: `node-cron`

---

## 📁 Repository Structure

```
geo_attendence_app/
├── backend/
│   ├── src/
│   │   ├── config/             # Database connection & environment setup
│   │   ├── controllers/        # Route logic (auth, class, membership, session, attendance)
│   │   ├── middleware/         # Auth guard, RBAC permission filters, upload handler
│   │   ├── models/             # Mongoose schemas (User, Class, ClassMembership, Session, Attendance)
│   │   ├── routes/             # Express API endpoints
│   │   ├── services/           # Attendance finalization cron & geofence calculators
│   │   ├── utils/              # Email regex & validation helpers
│   │   ├── app.js              # Express app configuration & middleware
│   │   └── server.js           # Server bootstrap & background cron job
│   ├── package.json
│   └── .env
│
├── frontend/
│   ├── assets/                 # App icons, SVG vectors, splash screens
│   ├── src/
│   │   ├── api/                # Universal HTTP client with auto-failover
│   │   ├── components/         # Button, Card, Input, Badge, Header, Logo, Calendar
│   │   ├── config/             # Known development server IPs & endpoints
│   │   ├── constants/          # Theme tokens (Peach & Sage palette, spacing, radii)
│   │   ├── context/            # AuthContext (login, register, logout, session restoration)
│   │   ├── navigation/         # AppNavigator with Android hardware back-handler
│   │   ├── screens/            # Application views:
│   │   │   ├── LoginScreen.js
│   │   │   ├── RegisterScreen.js
│   │   │   ├── MyClassesScreen.js
│   │   │   ├── ClassDetailsScreen.js
│   │   │   ├── SessionsScreen.js
│   │   │   ├── StudentsScreen.js
│   │   │   ├── TeachersScreen.js
│   │   │   ├── LocationSettingsScreen.js
│   │   │   ├── AttendanceCheckInScreen.js
│   │   │   ├── AttendanceRegisterScreen.js
│   │   │   └── MyAttendanceScreen.js
│   │   └── utils/              # Client-side email validation & geolocation helpers
│   ├── app.json                # Expo build & permissions manifest
│   └── package.json
│
├── .gitignore
└── README.md
```

---

## 📡 API Reference Summary

### Authentication (`/api/auth`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register new user with email regex & biometric binding |
| `POST` | `/api/auth/login` | Sign in with email & password, returns JWT |
| `GET` | `/api/auth/me` | Retrieve profile of currently authenticated user |

### Classes & RBAC (`/api/classes`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/classes` | Create a new classroom (caller becomes Owner) |
| `GET` | `/api/classes` | Get classrooms associated with user (as teacher or student) |
| `PATCH` | `/api/classes/:classId/location` | Configure geofence coordinates and radius |
| `POST` | `/api/classes/:classId/students` | Enroll student by verified email |
| `GET` | `/api/classes/:classId/students` | List all enrolled students in class |
| `POST` | `/api/classes/:classId/teachers` | Assign co-teacher with initial permissions |
| `GET` | `/api/classes/:classId/teachers` | List teaching staff & permissions |
| `PATCH` | `/api/classes/:classId/teachers/:userId/permissions` | Re-assign/update co-teacher permissions |
| `DELETE` | `/api/classes/:classId/teachers/:userId` | Remove a co-teacher from the class |

### Sessions & Attendance (`/api/classes/:classId/...`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/classes/:classId/sessions` | Schedule / start an attendance session |
| `GET` | `/api/classes/:classId/sessions` | List sessions (categorized by active/ended) |
| `PATCH` | `/api/classes/:classId/sessions/:sessionId/status` | Open or close attendance window |
| `POST` | `/api/classes/:classId/sessions/:sessionId/check-in` | Student geofenced check-in with photo upload |
| `GET` | `/api/classes/:classId/sessions/:sessionId/attendance` | View live session attendance roster |
| `GET` | `/api/classes/:classId/my-attendance` | View personal attendance record & calendar data |

---

## 💻 Installation & Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Expo Go App](https://expo.dev/go) installed on your physical iOS or Android device (required for camera, biometrics, and GPS).

---

### 1. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables in `backend/.env`:
   ```env
   PORT=5000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key

   # Supabase Storage (Attendance photo uploads)
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SECRET_KEY=your_supabase_service_role_key
   SUPABASE_ATTENDANCE_BUCKET=attendance-photos
   ```
4. Start development server:
   ```bash
   npm run dev
   ```
   The server will start on `http://localhost:5000` and connect to MongoDB.

---

### 2. Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Update server IP configuration in `frontend/src/config/api.js`:
   ```javascript
   export const KNOWN_SERVERS = [
       "http://<YOUR_LOCAL_IP>:5000",
   ];
   export const DEFAULT_API_BASE_URL = "http://<YOUR_LOCAL_IP>:5000";
   ```
4. Start the Expo development server:
   ```bash
   npx expo start
   ```
5. Scan the generated QR code using **Expo Go** on Android or Camera app on iOS.

---

## 🛡️ Security & Privacy Architecture

- **True Native Biometrics**: Raw fingerprint and FaceID templates never leave the mobile device hardware keychain (`LocalAuthentication` validates locally).
- **Anti-Spoofing Coordinates**: Geofence distance calculations are re-computed server-side using double-precision float Haversine formulas.
- **Signed Cloud Storage**: Verification photos are uploaded directly to access-controlled private buckets on Supabase.
- **Token Security**: Tokens are stored strictly in hardware-backed storage via `expo-secure-store`.

---

## 📄 License
This project is licensed under the ISC License.
