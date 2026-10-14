
import "dotenv/config";
import app from "./app.js";
import connectDB from "./config/db.js";
import cron from "node-cron";
import { finalizeExpiredSessions } from "./services/attendance.service.js";
const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await connectDB();
        // Recover any expired sessions after server startup.
        try {
            await finalizeExpiredSessions();
        } catch (error) {
            console.error("Initial attendance finalization failed:", error.message);
        }

        // Check for expired attendance windows every minute.
        cron.schedule("* * * * *", async () => {
            try {
                await finalizeExpiredSessions();
            } catch (error) {
                console.error("Attendance finalization failed:", error.message);
            }
        });
        app.listen(PORT, () => {
            console.log(`SmartAttend server running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error.message);
        process.exit(1);
    }
};

startServer();
