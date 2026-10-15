
import multer from "multer";

const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp"
];

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024,
        files: 1
    },
    fileFilter: (req, file, callback) => {
        if (!allowedTypes.includes(file.mimetype)) {
            return callback(
                new Error("Only JPEG, PNG, and WebP photos are allowed")
            );
        }

        callback(null, true);
    }
});

export const attendancePhotoUpload = (req, res, next) => {
    upload.single("photo")(req, res, (error) => {
        if (error instanceof multer.MulterError) {
            const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;

            return res.status(status).json({
                message:
                    status === 413
                        ? "Photo must be 5 MB or smaller"
                        : error.message
            });
        }

        if (error) {
            return res.status(400).json({
                message: error.message || "Invalid photo upload"
            });
        }

        next();
    });
};
