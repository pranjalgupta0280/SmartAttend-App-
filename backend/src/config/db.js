
import mongoose from "mongoose";

const connectDB = async () => {
    const uri = process.env.MONGODB_URI;

    if (!uri) {
        throw new Error("MONGODB_URI is missing from .env");
    }

    await mongoose.connect(uri);

    console.log("MongoDB connected successfully");
};

export default connectDB;
