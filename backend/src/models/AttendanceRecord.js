
import mongoose from "mongoose";

const attendanceRecordSchema = new mongoose.Schema(
    {
        classId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Class",
            required: true
        },

        sessionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AttendanceSession",
            required: true
        },

        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        status: {
            type: String,
            enum: ["PENDING", "PRESENT", "ABSENT"],
            default: "PENDING",
            required: true
        },

        method: {
            type: String,
            enum: ["PHOTO_GPS", "BIOMETRIC", "THUMB_SCAN", "MANUAL", "SYSTEM"]
        },

        photoPath: {
            type: String,
            default: ""
        },

        submittedLocation: {
            latitude: Number,
            longitude: Number
        },

        distanceMeters: {
            type: Number,
            min: 0
        },

        markedAt: Date,

        markedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },

        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    },
    { timestamps: true }
);

// One attendance record per student per lecture.
attendanceRecordSchema.index(
    { sessionId: 1, studentId: 1 },
    { unique: true }
);

const AttendanceRecord = mongoose.model(
    "AttendanceRecord",
    attendanceRecordSchema
);

export default AttendanceRecord;
