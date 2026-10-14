
import mongoose from "mongoose";

const scheduleSchema = new mongoose.Schema(
    {
        daysOfWeek: [{
            type: String,
            enum: [
                "MONDAY",
                "TUESDAY",
                "WEDNESDAY",
                "THURSDAY",
                "FRIDAY",
                "SATURDAY",
                "SUNDAY"
            ]
        }],
        startTime: String,
        endTime: String,
        attendanceOpensAt: String,
        attendanceClosesAt: String,
        timezone: {
            type: String,
            default: "Asia/Kolkata"
        }
    },
    { _id: false }
);

const locationSchema = new mongoose.Schema(
    {
        latitude: {
            type: Number,
            min: -90,
            max: 90
        },
        longitude: {
            type: Number,
            min: -180,
            max: 180
        },
        radiusMeters: {
            type: Number,
            min: 1,
            default: 100
        }
    },
    { _id: false }
);

const classSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        subject: {
            type: String,
            required: true,
            trim: true
        },
        section: {
            type: String,
            trim: true,
            default: ""
        },
        description: {
            type: String,
            trim: true,
            default: ""
        },
        ownerTeacherId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        schedule: {
            type: scheduleSchema,
            default: undefined
        },
        location: {
            type: locationSchema,
            default: undefined
        },
        isActive: {
            type: Boolean,
            default: true
        }
    },
    { timestamps: true }
);

const Class = mongoose.model("Class", classSchema);

export default Class;
