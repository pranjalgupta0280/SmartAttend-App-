
import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
    createClass,
    getMyClasses
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

router.patch(
    "/:classId/sessions/:sessionId/status",
    updateSessionStatus
);

export default router;
