
import mongoose from "mongoose";

const classMembershipSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        classId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Class",
            required: true
        },
        role: {
            type: String,
            enum: ["TEACHER", "STUDENT"],
            required: true
        },
        status: {
            type: String,
            enum: ["ACTIVE", "PENDING", "REMOVED"],
            default: "ACTIVE"
        },
        permissions: [{
            type: String,
            enum: [
                "MANAGE_CLASS",
                "MANAGE_MEMBERS",
                "MANAGE_SCHEDULE",
                "MANAGE_ATTENDANCE"
            ]
        }],
        assignedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        }
    },
    { timestamps: true }
);

// A user has one role per class.
classMembershipSchema.index(
    { userId: 1, classId: 1 },
    { unique: true }
);

const ClassMembership = mongoose.model(
    "ClassMembership",
    classMembershipSchema
);

export default ClassMembership;
