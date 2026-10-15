
import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
    createClass,
    getMyClasses,
    updateClassLocation
} from "../controllers/class.controller.js";

import {
    addStudent,
    getClassStudents,
    addCoTeacher,
    getClassTeachers,
    removeCoTeacher
} from "../controllers/membership.controller.js";
import {
    createSession,
    getClassSessions,
    updateSessionStatus
} from "../controllers/session.controller.js";
const router = express.Router();

import {
    checkIn,
    getSessionAttendance,
    getMyClassAttendance
} from "../controllers/attendance.controller.js";

import {
    attendancePhotoUpload
} from "../middleware/attendanceUpload.middleware.js";

router.use(protect);

router.post("/", createClass);
router.get("/", getMyClasses);

router.post("/:classId/students", addStudent);
router.get("/:classId/students", getClassStudents);
router.post("/:classId/teachers", addCoTeacher);
router.get("/:classId/teachers", getClassTeachers);
router.delete("/:classId/teachers/:userId", removeCoTeacher);


router.post("/:classId/sessions", createSession);

router.get("/:classId/sessions", getClassSessions);
router.patch("/:classId/location", updateClassLocation);

router.patch(
    "/:classId/sessions/:sessionId/status",
    updateSessionStatus
);


router.get(
    "/:classId/sessions/:sessionId/attendance",
    getSessionAttendance
);
router.get(
    "/:classId/my-attendance",
    getMyClassAttendance
);
router.post(
    "/:classId/sessions/:sessionId/check-in",
    attendancePhotoUpload,
    checkIn
);
export default router;
