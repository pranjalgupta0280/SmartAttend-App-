
import mongoose from "mongoose";
import User from "../models/User.js";
import Class from "../models/Class.js";
import ClassMembership from "../models/ClassMembership.js";


// POST /api/classes/:classId/students
export const addStudent = async (req, res) => {
    try {
        const { classId } = req.params;
        const { email } = req.body;

        if (
            !mongoose.isValidObjectId(classId) ||
            typeof email !== "string" ||
            !email.trim()
        ) {
            return res.status(400).json({
                message: "A valid class ID and student email are required"
            });
        }

        // 1. Verify the teacher can manage members
        const teacherMembership = await ClassMembership.findOne({
            userId: req.user.id,
            classId,
            role: "TEACHER",
            status: "ACTIVE"
        });

        if (
            !teacherMembership ||
            !teacherMembership.permissions.includes("MANAGE_MEMBERS")
        ) {
            return res.status(403).json({
                message: "You are not allowed to add students to this class"
            });
        }

        // 2. Verify the class exists
        const classExists = await Class.exists({
            _id: classId,
            isActive: true
        });

        if (!classExists) {
            return res.status(404).json({
                message: "Class not found"
            });
        }

        // 3. Find the registered user
        const student = await User.findOne({
            email: email.trim().toLowerCase(),
            isActive: true
        });

        if (!student) {
            return res.status(404).json({
                message: "Active user not found. Ask them to register first."
            });
        }

        // 4. Do not overwrite an existing membership or role
        const existingMembership = await ClassMembership.findOne({
            userId: student._id,
            classId
        });

        if (existingMembership) {
            return res.status(409).json({
                message:
                    existingMembership.status === "ACTIVE"
                        ? "This user already has a membership in this class"
                        : "A previous membership exists; resolve it before re-enrolling"
            });
        }

        // 5. Enroll the student
        const membership = await ClassMembership.create({
            userId: student._id,
            classId,
            role: "STUDENT",
            status: "ACTIVE",
            permissions: [],
            assignedBy: req.user.id
        });

        return res.status(201).json({
            message: "Student added successfully",
            student: {
                id: student._id,
                name: student.name,
                email: student.email
            },
            membershipId: membership._id
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: "This user already has a membership in the class"
            });
        }

        console.error("Add student error:", error.message);

        return res.status(500).json({
            message: "Failed to add student"
        });
    }
};

// GET /api/classes/:classId/students
export const getClassStudents = async (req, res) => {
    try {
        const { classId } = req.params;

        if (!mongoose.isValidObjectId(classId)) {
            return res.status(400).json({
                message: "Invalid class ID"
            });
        }

        // 1. Verify the teacher can manage class members
        const teacherMembership = await ClassMembership.findOne({
            userId: req.user.id,
            classId,
            role: "TEACHER",
            status: "ACTIVE"
        });

        if (
            !teacherMembership ||
            !teacherMembership.permissions.includes("MANAGE_MEMBERS")
        ) {
            return res.status(403).json({
                message: "You are not allowed to view this class roster"
            });
        }

        // 2. Retrieve active student memberships and their user details
        const memberships = await ClassMembership.find({
            classId,
            role: "STUDENT",
            status: "ACTIVE"
        })
            .populate("userId", "name email")
            .sort({ createdAt: 1 });

        const students = memberships
            .filter((membership) => membership.userId)
            .map((membership) => ({
                id: membership.userId._id,
                name: membership.userId.name,
                email: membership.userId.email,
                enrolledAt: membership.createdAt
            }));

        return res.status(200).json({
            count: students.length,
            students
        });
    } catch (error) {
        console.error("Get class students error:", error.message);

        return res.status(500).json({
            message: "Failed to fetch class students"
        });
    }
};
const CO_TEACHER_PERMISSIONS = [
    "MANAGE_MEMBERS",
    "MANAGE_SCHEDULE",
    "MANAGE_ATTENDANCE"
];

// POST /api/classes/:classId/teachers
export const addCoTeacher = async (req, res) => {
    try {
        const { classId } = req.params;
        const { email, permissions } = req.body;

        if (
            !mongoose.isValidObjectId(classId) ||
            typeof email !== "string" ||
            !email.trim()
        ) {
            return res.status(400).json({
                message: "A valid class ID and teacher email are required"
            });
        }

        // Only the original class owner can assign co-teachers.
        const classDoc = await Class.findById(classId);

        if (!classDoc || !classDoc.isActive) {
            return res.status(404).json({ message: "Class not found" });
        }

        if (classDoc.ownerTeacherId.toString() !== req.user.id) {
            return res.status(403).json({
                message: "Only the class owner can assign co-teachers"
            });
        }

        // Verify the owner still has active teacher membership.
        const ownerMembership = await ClassMembership.findOne({
            userId: req.user.id,
            classId,
            role: "TEACHER",
            status: "ACTIVE"
        });

        if (!ownerMembership) {
            return res.status(403).json({
                message: "Active owner membership required"
            });
        }

        // Default to operational permissions if none are supplied.
        const selectedPermissions =
            permissions === undefined
                ? CO_TEACHER_PERMISSIONS
                : permissions;

        if (
            !Array.isArray(selectedPermissions) ||
            !selectedPermissions.every(
                (permission) =>
                    CO_TEACHER_PERMISSIONS.includes(permission)
            ) ||
            new Set(selectedPermissions).size !== selectedPermissions.length
        ) {
            return res.status(400).json({
                message: "Invalid co-teacher permissions"
            });
        }

        const teacher = await User.findOne({
            email: email.trim().toLowerCase(),
            isActive: true
        });

        if (!teacher) {
            return res.status(404).json({
                message: "Active registered user not found"
            });
        }

        if (teacher._id.toString() === req.user.id) {
            return res.status(400).json({
                message: "You are already the owner of this class"
            });
        }

        let membership = await ClassMembership.findOne({
            userId: teacher._id,
            classId
        });

        if (membership?.status === "ACTIVE") {
            return res.status(409).json({
                message: "This user already has an active membership in this class"
            });
        }

        if (membership?.status === "PENDING") {
            return res.status(409).json({
                message: "This user already has a pending membership"
            });
        }

        if (membership) {
            // Reactivate a removed membership.
            membership.role = "TEACHER";
            membership.status = "ACTIVE";
            membership.permissions = selectedPermissions;
            membership.assignedBy = req.user.id;
            await membership.save();
        } else {
            membership = await ClassMembership.create({
                userId: teacher._id,
                classId,
                role: "TEACHER",
                status: "ACTIVE",
                permissions: selectedPermissions,
                assignedBy: req.user.id
            });
        }

        return res.status(201).json({
            message: "Co-teacher assigned successfully",
            teacher: {
                id: teacher._id,
                name: teacher.name,
                email: teacher.email
            },
            permissions: membership.permissions
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: "This user already has a membership in the class"
            });
        }

        console.error("Assign co-teacher error:", error.message);

        return res.status(500).json({
            message: "Failed to assign co-teacher"
        });
    }
};

// GET /api/classes/:classId/teachers
export const getClassTeachers = async (req, res) => {
    try {
        const { classId } = req.params;

        if (!mongoose.isValidObjectId(classId)) {
            return res.status(400).json({
                message: "Invalid class ID"
            });
        }

        const classDoc = await Class.findById(classId);

        if (!classDoc || !classDoc.isActive) {
            return res.status(404).json({ message: "Class not found" });
        }

        // Owner or active co-teacher can view the teacher roster.
        const teacherMembership = await ClassMembership.findOne({
            userId: req.user.id,
            classId,
            role: "TEACHER",
            status: "ACTIVE"
        });

        if (!teacherMembership) {
            return res.status(403).json({
                message: "You cannot view this class's teachers"
            });
        }

        const memberships = await ClassMembership.find({
            classId,
            role: "TEACHER",
            status: "ACTIVE"
        }).populate("userId", "name email");

        const teachers = memberships
            .filter((m) => m.userId)
            .map((m) => ({
                id: m.userId._id,
                name: m.userId.name,
                email: m.userId.email,
                isOwner:
                    m.userId._id.toString() ===
                    classDoc.ownerTeacherId.toString(),
                permissions: m.permissions
            }));

        return res.status(200).json({
            count: teachers.length,
            teachers
        });
    } catch (error) {
        console.error("Get class teachers error:", error.message);

        return res.status(500).json({
            message: "Failed to fetch class teachers"
        });
    }
};

// DELETE /api/classes/:classId/teachers/:userId
export const removeCoTeacher = async (req, res) => {
    try {
        const { classId, userId } = req.params;

        if (
            !mongoose.isValidObjectId(classId) ||
            !mongoose.isValidObjectId(userId)
        ) {
            return res.status(400).json({
                message: "Invalid class ID or user ID"
            });
        }

        const classDoc = await Class.findById(classId);

        if (!classDoc || !classDoc.isActive) {
            return res.status(404).json({ message: "Class not found" });
        }

        // Only the owner may remove a co-teacher.
        if (classDoc.ownerTeacherId.toString() !== req.user.id) {
            return res.status(403).json({
                message: "Only the class owner can remove co-teachers"
            });
        }

        if (userId === classDoc.ownerTeacherId.toString()) {
            return res.status(400).json({
                message: "The class owner cannot be removed as a co-teacher"
            });
        }

        const membership = await ClassMembership.findOne({
            userId,
            classId,
            role: "TEACHER",
            status: "ACTIVE"
        });

        if (!membership) {
            return res.status(404).json({
                message: "Active co-teacher membership not found"
            });
        }

        membership.status = "REMOVED";
        membership.permissions = [];
        await membership.save();

        return res.status(200).json({
            message: "Co-teacher removed successfully"
        });
    } catch (error) {
        console.error("Remove co-teacher error:", error.message);

        return res.status(500).json({
            message: "Failed to remove co-teacher"
        });
    }
};