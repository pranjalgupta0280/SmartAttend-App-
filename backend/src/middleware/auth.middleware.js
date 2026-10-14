
import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                message: "Authentication token is required"
            });
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.sub);

        if (!user || !user.isActive) {
            return res.status(401).json({
                message: "Invalid or inactive user"
            });
        }

        // Attach the authenticated identity to the request
        req.user = {
            id: user._id.toString(),
            name: user.name,
            email: user.email
        };

        next();
    } catch (error) {
        if (
            error.name === "JsonWebTokenError" ||
            error.name === "TokenExpiredError"
        ) {
            return res.status(401).json({
                message: "Invalid or expired token"
            });
        }

        console.error("Authentication error:", error.message);

        return res.status(500).json({
            message: "Authentication failed"
        });
    }
};
