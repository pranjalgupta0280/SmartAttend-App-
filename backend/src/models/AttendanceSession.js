
import mongoose from "mongoose";

const attendanceSessionSchema = new mongoose.Schema(
    {
        classId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Class",
            required: true
        },

        title: {
            type: String,
            trim: true,
            default: "Lecture"
        },

        startsAt: {
            type: Date,
            required: true
        },

        endsAt: {
            type: Date,
            required: true
        },

        attendanceOpensAt: {
            type: Date,
            required: true
        },

        attendanceClosesAt: {
            type: Date,
            required: true
        },

        status: {
            type: String,
            enum: [
                "SCHEDULED",
                "COMPLETED",
                "HOLIDAY",
                "CANCELLED"
            ],
            default: "SCHEDULED"
        },

        reason: {
            type: String,
            trim: true,
            default: ""
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    },
    { timestamps: true }
);

// Prevent duplicate sessions for the same class and start time.
attendanceSessionSchema.index(
    { classId: 1, startsAt: 1 },
    { unique: true }
);

const AttendanceSession = mongoose.model(
    "AttendanceSession",
    attendanceSessionSchema
);

export default AttendanceSession;
