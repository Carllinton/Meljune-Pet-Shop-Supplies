const multer = require("multer");
const path = require("path");
const fs = require("fs");

// =============================================
// REUSABLE IMAGE UPLOADER
// =============================================

const createImageUploader = (folder, prefix) => {

    // =============================================
    // UPLOAD DIRECTORY
    // =============================================

    const uploadDir = path.join(
        __dirname,
        "../uploads",
        folder
    );

    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, {
            recursive: true
        });
    }

    // =============================================
    // STORAGE
    // =============================================

    const storage = multer.diskStorage({

        destination: (req, file, cb) => {
            cb(null, uploadDir);
        },

        filename: (req, file, cb) => {

            const extension =
                path.extname(file.originalname).toLowerCase();

            const filename =
                `${prefix}-${Date.now()}-${Math.round(
                    Math.random() * 1000000000
                )}${extension}`;

            cb(null, filename);
        }

    });

    // =============================================
    // FILE FILTER
    // =============================================

    const fileFilter = (req, file, cb) => {

        const allowedMimeTypes = [
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp"
        ];

        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(
                new Error(
                    "Only JPG, JPEG, PNG, and WEBP images are allowed"
                ),
                false
            );
        }
    };

    // =============================================
    // MULTER
    // =============================================

    return multer({

        storage,

        fileFilter,

        limits: {
            fileSize: 5 * 1024 * 1024 // 5 MB
        }

    });
};


// =============================================
// EXPORT
// =============================================

module.exports = createImageUploader;