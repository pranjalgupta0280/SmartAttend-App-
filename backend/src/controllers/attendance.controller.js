
import mongoose from "mongoose";
import Class from "../models/Class.js";
import ClassMembership from "../models/ClassMembership.js";
import AttendanceSession from "../models/AttendanceSession.js";
import AttendanceRecord from "../models/AttendanceRecord.js";
import { randomUUID } from "node:crypto";
import supabase from "../config/storage.js";

const getDistanceMeters = (lat1, lon1, lat2, lon2) => {
    const toRadians = degrees => degrees * Math.PI / 180;
    const earthRadius = 6371000;

    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) ** 2;

    return 2 * earthRadius * Math.asin(
        Math.sqrt(Math.min(1, a))
    );
};

// POST /api/classes/:classId/sessions/:sessionId/check-in

export const checkIn = async (req, res) => {
    let uploadedPath = null;

    const bucket =
        process.env.SUPABASE_ATTENDANCE_BUCKET || "attendance-photos";

    try {
        const { classId, sessionId } = req.params;
        const { latitude: latInput, longitude: lonInput, biometricVerified } = req.body;

        if (
            !mongoose.isValidObjectId(classId) ||
            !mongoose.isValidObjectId(sessionId)
        ) {
            return res.status(400).json({
                message: "Invalid class ID or session ID"
            });
        }

        const isBiometric =
            biometricVerified === true ||
            biometricVerified === "true";

        if (!isBiometric && !req.file) {
            return res.status(400).json({
                message: "A verified biometric thumb scan or photo is required"
            });
        }

        if (
            latInput === undefined ||
            lonInput === undefined ||
            String(latInput).trim() === "" ||
            String(lonInput).trim() === ""
        ) {
            return res.status(400).json({
                message: "Latitude and longitude are required"
            });
        }

        const latitude = Number(latInput);
        const longitude = Number(lonInput);

        if (
            !Number.isFinite(latitude) ||
            latitude < -90 ||
            latitude > 90 ||
            !Number.isFinite(longitude) ||
            longitude < -180 ||
            longitude > 180
        ) {
            return res.status(400).json({
                message: "Invalid coordinates"
            });
        }

        // 1. Verify student enrollment.
        const membership = await ClassMembership.findOne({
            userId: req.user.id,
            classId,
            role: "STUDENT",
            status: "ACTIVE"
        });

        if (!membership) {
            return res.status(403).json({
                message: "You are not enrolled in this class"
            });
        }

        // 2. Verify class and session.
        const classDoc = await Class.findOne({
            _id: classId,
            isActive: true
        });

        if (!classDoc) {
            return res.status(404).json({
                message: "Class not found"
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

        if (session.status !== "SCHEDULED") {
            return res.status(409).json({
                message: "Attendance is unavailable for this session"
            });
        }

        // 3. Validate the server's current time.
        const now = new Date();

        if (
            now < session.attendanceOpensAt ||
            now > session.attendanceClosesAt
        ) {
            return res.status(403).json({
                message: "Outside the attendance time window"
            });
        }

        // 4. Validate the configured classroom location.
        const location = classDoc.location;

        if (
            !location ||
            typeof location.latitude !== "number" ||
            typeof location.longitude !== "number" ||
            typeof location.radiusMeters !== "number"
        ) {
            return res.status(409).json({
                message: "Attendance location is not configured"
            });
        }

        const distanceMeters = getDistanceMeters(
            location.latitude,
            location.longitude,
            latitude,
            longitude
        );

        if (distanceMeters > location.radiusMeters) {
            return res.status(403).json({
                message: "You are outside the permitted radius",
                distanceMeters: Math.round(distanceMeters)
            });
        }

        // 5. Check for an existing final attendance record.
        const existingRecord = await AttendanceRecord.findOne({
            sessionId,
            studentId: req.user.id
        });

        if (existingRecord && existingRecord.status !== "PENDING") {
            return res.status(409).json({
                message: "Attendance has already been recorded"
            });
        }

        // 6. Handle photo upload if not biometric
        let objectPath = "";
        let method = "BIOMETRIC";

        if (!isBiometric) {
            method = "PHOTO_GPS";
            const extensionByType = {
                "image/jpeg": "jpg",
                "image/png": "png",
                "image/webp": "webp"
            };

            const extension = extensionByType[req.file.mimetype];

            if (!extension) {
                return res.status(400).json({
                    message: "Unsupported photo format"
                });
            }

            objectPath =
                `${classId}/${sessionId}/${req.user.id}/` +
                `${Date.now()}-${randomUUID()}.${extension}`;

            if (!supabase) {
                return res.status(500).json({
                    message: "Photo storage is not configured. Add SUPABASE_URL and SUPABASE_SECRET_KEY to .env"
                });
            }

            const { error: uploadError } = await supabase.storage
                .from(bucket)
                .upload(objectPath, req.file.buffer, {
                    contentType: req.file.mimetype,
                    cacheControl: "3600",
                    upsert: false
                });

            if (uploadError) {
                console.error("Supabase storage error:", uploadError);
                throw new Error(
                    `Supabase upload failed: ${uploadError.message}. Make sure SUPABASE_SECRET_KEY in .env is the 'service_role' secret key.`
                );
            }

            uploadedPath = objectPath;
        }

        // 7. Store attendance record
        const recordData = {
            classId,
            sessionId,
            studentId: req.user.id,
            status: "PRESENT",
            method,
            photoPath: objectPath,
            submittedLocation: { latitude, longitude },
            distanceMeters: Math.round(distanceMeters),
            markedAt: now,
            markedBy: req.user.id
        };

        let record;

        if (existingRecord) {
            Object.assign(existingRecord, recordData);
            record = await existingRecord.save();
        } else {
            record = await AttendanceRecord.create(recordData);
        }

        // Keep the uploaded object after a successful database save.
        uploadedPath = null;

        return res.status(201).json({
            message: "Attendance marked successfully",
            attendance: {
                id: record._id,
                sessionId: record.sessionId,
                status: record.status,
                markedAt: record.markedAt,
                distanceMeters: record.distanceMeters
            }
        });
    } catch (error) {
        // Clean up the uploaded image if saving attendance fails.
        if (uploadedPath) {
            const { error: cleanupError } = await supabase.storage
                .from(bucket)
                .remove([uploadedPath]);

            if (cleanupError) {
                console.error("Photo cleanup failed:", cleanupError.message);
            }
        }

        if (error.code === 11000) {
            return res.status(409).json({
                message: "Attendance has already been recorded"
            });
        }

        console.error("Check-in error:", error.message);

        return res.status(500).json({
            message: error.message || "Failed to upload photo or mark attendance"
        });
    }
};

// GET /api/classes/:classId/sessions/:sessionId/attendance
export const getSessionAttendance = async (req, res) => {
    try {
        const { classId, sessionId } = req.params;

        if (
            !mongoose.isValidObjectId(classId) ||
            !mongoose.isValidObjectId(sessionId)
        ) {
            return res.status(400).json({
                message: "Invalid class ID or session ID"
            });
        }

        // Only teachers with attendance-management permission can view the register.
        const membership = await ClassMembership.findOne({
            userId: req.user.id,
            classId,
            role: "TEACHER",
            status: "ACTIVE"
        });

        if (
            !membership ||
            !membership.permissions.includes("MANAGE_ATTENDANCE")
        ) {
            return res.status(403).json({
                message: "You cannot view this attendance register"
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

        const memberships = await ClassMembership.find({
            classId,
            role: "STUDENT",
            status: "ACTIVE"
        }).populate("userId", "name email");

        const records = await AttendanceRecord.find({
            classId,
            sessionId
        });

        const recordByStudent = new Map(
            records.map(record => [
                record.studentId.toString(),
                record
            ])
        );

        const students = memberships
            .filter(item => item.userId)
            .map(item => {
                const student = item.userId;
                const record = recordByStudent.get(student._id.toString());

                let status = record?.status || "PENDING";

                if (session.status === "HOLIDAY" ||
                    session.status === "CANCELLED") {
                    status = session.status;
                }

                return {
                    studentId: student._id,
                    name: student.name,
                    email: student.email,
                    status,
                    markedAt: record?.markedAt || null,
                    method: record?.method || null
                };
            });

        return res.status(200).json({
            sessionId: session._id,
            sessionStatus: session.status,
            count: students.length,
            students
        });
    } catch (error) {
        console.error("Get attendance register error:", error.message);

        return res.status(500).json({
            message: "Failed to fetch attendance register"
        });
    }
};

export const getMyClassAttendance = async (req, res) => {
    try {
        const { classId } = req.params;

        if (!mongoose.isValidObjectId(classId)) {
            return res.status(400).json({
                message: "Invalid class ID"
            });
        }

        // Only an enrolled student may view their own history.
        const membership = await ClassMembership.findOne({
            userId: req.user.id,
            classId,
            role: "STUDENT",
            status: "ACTIVE"
        });

        if (!membership) {
            return res.status(403).json({
                message: "You are not enrolled as a student in this class"
            });
        }

        // Show sessions that have started, newest first.
        const sessions = await AttendanceSession.find({
            classId,
            startsAt: { $lte: new Date() }
        }).sort({ startsAt: -1 });

        const records = await AttendanceRecord.find({
            classId,
            studentId: req.user.id,
            sessionId: { $in: sessions.map(s => s._id) }
        });

        const recordBySession = new Map(
            records.map(record => [
                record.sessionId.toString(),
                record
            ])
        );

        const history = sessions.map(session => {
            const record = recordBySession.get(session._id.toString());

            let status;

            if (session.status === "HOLIDAY") {
                status = "HOLIDAY";
            } else if (session.status === "CANCELLED") {
                status = "CANCELLED";
            } else if (session.status === "COMPLETED") {
                // A completed session with no PRESENT record counts as absent.
                status =
                    record?.status === "PRESENT"
                        ? "PRESENT"
                        : "ABSENT";
            } else {
                status = record?.status || "PENDING";
            }

            return {
                sessionId: session._id,
                title: session.title,
                date: session.startsAt,
                startsAt: session.startsAt,
                endsAt: session.endsAt,
                sessionStatus: session.status,
                attendanceStatus: status,
                markedAt: record?.markedAt || null
            };
        });

        // Only finalized sessions count toward the percentage.
        const eligibleSessions = sessions.filter(
            session => session.status === "COMPLETED"
        );

        const presentCount = eligibleSessions.filter(session => {
            const record = recordBySession.get(session._id.toString());
            return record?.status === "PRESENT";
        }).length;

        const eligibleCount = eligibleSessions.length;
        const absentCount = eligibleCount - presentCount;

        const attendancePercentage = eligibleCount
            ? Math.round((presentCount / eligibleCount) * 100)
            : 0;

        return res.status(200).json({
            classId,
            summary: {
                present: presentCount,
                absent: absentCount,
                eligibleSessions: eligibleCount,
                attendancePercentage
            },
            history
        });
    } catch (error) {
        console.error("Student attendance history error:", error.message);

        return res.status(500).json({
            message: "Failed to fetch attendance history"
        });
    }
};
