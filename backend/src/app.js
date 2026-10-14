import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import authRoutes from "./routes/auth.routes.js";
import classRoutes from "./routes/class.routes.js";
const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.json({ message: "Welcome to SmartAttend API" });
});

app.get("/api/health", (req, res) => {
    res.status(200).json({
        status: "ok",
        database:
            mongoose.connection.readyState === 1
                ? "connected"
                : "disconnected"
    });
});

app.use("/api/auth", authRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/classes", classRoutes);
export default app; 
