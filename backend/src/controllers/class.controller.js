
import Class from "../models/Class.js";
import ClassMembership from "../models/ClassMembership.js";
import mongoose from "mongoose";
const teacherPermissions = [
    "MANAGE_CLASS",
    "MANAGE_MEMBERS",
    "MANAGE_SCHEDULE",
    "MANAGE_ATTENDANCE"
];

// POST /api/classes
export const createClass = async (req, res) => {
    let createdClass;

    try {
        const { name, subject, section, description } = req.body;

        if (
            typeof name !== "string" ||
            !name.trim() ||
            typeof subject !== "string" ||
            !subject.trim()
        ) {
            return res.status(400).json({
                message: "Class name and subject are required"
            });
        }

        createdClass = await Class.create({
            name: name.trim(),
            subject: subject.trim(),
            section:
                typeof section === "string" ? section.trim() : "",
            description:
                typeof description === "string" ? description.trim() : "",
            ownerTeacherId: req.user.id
        });

        // The creator becomes the owner and an active teacher.
        const membership = await ClassMembership.create({
            userId: req.user.id,
            classId: createdClass._id,
            role: "TEACHER",
            status: "ACTIVE",
            permissions: teacherPermissions,
            assignedBy: req.user.id
        });

        return res.status(201).json({
            message: "Class created successfully",
            class: createdClass,
            membership
        });
    } catch (error) {
        // Avoid leaving a class behind if membership creation fails.
        if (createdClass) {
            await Class.deleteOne({ _id: createdClass._id }).catch(() => { });
        }

        if (error.code === 11000) {
            return res.status(409).json({
                message: "Membership already exists"
            });
        }

        console.error("Create class error:", error.message);

        return res.status(500).json({
            message: "Failed to create class"
        });
    }
};


export const getMyClasses = async (req, res) => {
    try {
        const memberships = await ClassMembership.find({
            userId: req.user.id,
            status: "ACTIVE"
        }).populate("classId");

        const classes = memberships
            .filter((membership) => membership.classId)
            .map((membership) => ({
                ...membership.classId.toObject(),
                myRole: membership.role,
                permissions: membership.permissions
            }));

        return res.status(200).json({
            count: classes.length,
            classes
        });
    } catch (error) {
        console.error("Fetch classes error:", error.message);

        return res.status(500).json({
            message: "Failed to fetch classes"
        });
    }
};


export const updateClassLocation = async (req, res) => {
    try {
        const { classId } = req.params;
        const { latitude, longitude, radiusMeters } = req.body;

        if (!mongoose.isValidObjectId(classId)) {
            return res.status(400).json({
                message: "Invalid class ID"
            });
        }

        if (
            typeof latitude !== "number" ||
            !Number.isFinite(latitude) ||
            latitude < -90 ||
            latitude > 90 ||
            typeof longitude !== "number" ||
            !Number.isFinite(longitude) ||
            longitude < -180 ||
            longitude > 180 ||
            typeof radiusMeters !== "number" ||
            !Number.isFinite(radiusMeters) ||
            radiusMeters < 1 ||
            radiusMeters > 1000
        ) {
            return res.status(400).json({
                message: "Provide valid coordinates and a radius between 1 and 1000 metres"
            });
        }

        const membership = await ClassMembership.findOne({
            userId: req.user.id,
            classId,
            role: "TEACHER",
            status: "ACTIVE"
        });

        if (
            !membership ||
            !membership.permissions.includes("MANAGE_SCHEDULE")
        ) {
            return res.status(403).json({
                message: "You cannot change this class's location"
            });
        }

        const classDoc = await Class.findOne({
            _id: classId,
            isActive: true
        });

        if (!classDoc) {
            return res.status(404).json({
                message: "Class not found"
            });
        }

        classDoc.location = {
            latitude,
            longitude,
            radiusMeters
        };

        await classDoc.save();

        return res.status(200).json({
            message: "Attendance location updated successfully",
            location: classDoc.location
        });
    } catch (error) {
        console.error("Update location error:", error.message);

        return res.status(500).json({
            message: "Failed to update attendance location"
        });
    }
};
