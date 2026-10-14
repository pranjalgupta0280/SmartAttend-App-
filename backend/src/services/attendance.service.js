
import AttendanceSession from "../models/AttendanceSession.js";
import AttendanceRecord from "../models/AttendanceRecord.js";
import ClassMembership from "../models/ClassMembership.js";

let isFinalizing = false;

export const finalizeExpiredSessions = async () => {
    // Prevent overlapping runs within this server process.
    if (isFinalizing) return;

    isFinalizing = true;

    try {
        const now = new Date();

        // Find scheduled sessions whose attendance window has closed.
        const sessions = await AttendanceSession.find({
            status: "SCHEDULED",
            attendanceClosesAt: { $lte: now }
        });

        for (const session of sessions) {
            const memberships = await ClassMembership.find({
                classId: session.classId,
                role: "STUDENT",
                status: "ACTIVE"
            }).select("userId");

            // Create an ABSENT record for students without a record.
            if (memberships.length > 0) {
                await AttendanceRecord.bulkWrite(
                    memberships.map(({ userId }) => ({
                        updateOne: {
                            filter: {
                                sessionId: session._id,
                                studentId: userId
                            },
                            update: {
                                $setOnInsert: {
                                    classId: session.classId,
                                    sessionId: session._id,
                                    studentId: userId,
                                    status: "ABSENT",
                                    method: "SYSTEM",
                                    markedAt: now
                                }
                            },
                            upsert: true
                        }
                    })),
                    { ordered: false }
                );
            }

            // Convert remaining PENDING records to ABSENT.
            // Existing PRESENT records remain unchanged.
            await AttendanceRecord.updateMany(
                {
                    sessionId: session._id,
                    status: "PENDING"
                },
                {
                    $set: {
                        status: "ABSENT",
                        method: "SYSTEM",
                        markedAt: now
                    }
                }
            );

            // Mark the session finalized after processing its records.
            await AttendanceSession.updateOne(
                {
                    _id: session._id,
                    status: "SCHEDULED"
                },
                {
                    $set: {
                        status: "COMPLETED"
                    }
                }
            );

            console.log(
                `Finalized attendance for session ${session._id}`
            );
        }
    } finally {
        isFinalizing = false;
    }
};
