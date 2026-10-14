
import mongoose from "mongoose";
import Class from "../models/Class.js";
import ClassMembership from "../models/ClassMembership.js";
import AttendanceSession from "../models/AttendanceSession.js";

const canManageSchedule = async (userId, classId) => {
    const membership = await ClassMembership.findOne({
        userId,
        classId,
        role: "TEACHER",
        status: "ACTIVE"
    });

    return Boolean(
        membership?.permissions?.includes("MANAGE_SCHEDULE")
    );
};

// POST /api/classes/:classId/sessions
export const createSession = async (req, res) => {
    try {
        const { classId } = req.params;
        const {
            title,
            startsAt,
            endsAt,
            attendanceOpensAt,
            attendanceClosesAt
        } = req.body;

        if (!mongoose.isValidObjectId(classId)) {
            return res.status(400).json({
                message: "Invalid class ID"
            });
        }

        const classExists = await Class.exists({
            _id: classId,
            isActive: true
        });

        if (!classExists) {
            return res.status(404).json({
                message: "Class not found"
            });
        }

        if (!(await canManageSchedule(req.user.id, classId))) {
            return res.status(403).json({
                message: "You cannot manage this class schedule"
            });
        }

        const dates = {
            startsAt: new Date(startsAt),
            endsAt: new Date(endsAt),
            attendanceOpensAt: new Date(attendanceOpensAt),
            attendanceClosesAt: new Date(attendanceClosesAt)
        };

        if (
            Object.values(dates).some(
                date => Number.isNaN(date.getTime())
            ) ||
            dates.startsAt >= dates.endsAt ||
            dates.startsAt > dates.attendanceOpensAt ||
            dates.attendanceOpensAt >= dates.attendanceClosesAt ||
            dates.attendanceClosesAt > dates.endsAt
        ) {
            return res.status(400).json({
                message:
                    "Invalid dates. The attendance window must be inside the lecture time."
            });
        }

        const session = await AttendanceSession.create({
            classId,
            title:
                typeof title === "string" && title.trim()
                    ? title.trim()
                    : "Lecture",
            ...dates,
            createdBy: req.user.id
        });

        return res.status(201).json({
            message: "Lecture scheduled successfully",
            session
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: "A lecture is already scheduled at this start time"
            });
        }

        console.error("Create session error:", error.message);

        return res.status(500).json({
            message: "Failed to schedule lecture"
        });
    }
};

// GET /api/classes/:classId/sessions
export const getClassSessions = async (req, res) => {
    try {
        const { classId } = req.params;

        if (!mongoose.isValidObjectId(classId)) {
            return res.status(400).json({
                message: "Invalid class ID"
            });
        }

        // Both teachers and enrolled students may view the schedule.
        const membership = await ClassMembership.findOne({
            userId: req.user.id,
            classId,
            status: "ACTIVE",
            role: { $in: ["TEACHER", "STUDENT"] }
        });

        if (!membership) {
            return res.status(403).json({
                message: "You do not have access to this class schedule"
            });
        }

        const sessions = await AttendanceSession.find({ classId })
            .sort({ startsAt: 1 });

        return res.status(200).json({
            count: sessions.length,
            sessions
        });
    } catch (error) {
        console.error("Get sessions error:", error.message);

        return res.status(500).json({
            message: "Failed to fetch lecture schedule"
        });
    }
};

// PATCH /api/classes/:classId/sessions/:sessionId/status
export const updateSessionStatus = async (req, res) => {
    try {
        const { classId, sessionId } = req.params;
        const { status, reason } = req.body;

        if (
            !mongoose.isValidObjectId(classId) ||
            !mongoose.isValidObjectId(sessionId)
        ) {
            return res.status(400).json({
                message: "Invalid class ID or session ID"
            });
        }

        if (!["SCHEDULED", "HOLIDAY", "CANCELLED"].includes(status)) {
            return res.status(400).json({
                message: "Status must be SCHEDULED, HOLIDAY, or CANCELLED"
            });
        }

        if (
            reason !== undefined &&
            (typeof reason !== "string" || reason.length > 300)
        ) {
            return res.status(400).json({
                message: "Reason must be a string of at most 300 characters"
            });
        }

        if (!(await canManageSchedule(req.user.id, classId))) {
            return res.status(403).json({
                message: "You cannot change this class schedule"
            });
        }

        const session = await AttendanceSession.findOne({
            _id: sessionId,
            classId
        });

        if (!session) {
            return res.status(404).json({
                message: "Lecture session not found"
            });
        }

        if (session.status === "COMPLETED") {
            return res.status(409).json({
                message: "A completed lecture cannot be changed this way"
            });
        }

        session.status = status;
        session.reason = reason?.trim() || "";
        session.updatedBy = req.user.id;

        await session.save();

        return res.status(200).json({
            message: "Lecture status updated successfully",
            session
        });
    } catch (error) {
        console.error("Update session status error:", error.message);

        return res.status(500).json({
            message: "Failed to update lecture status"
        });
    }
};
