/**
 * File Upload Middleware — Multer Configuration
 * Handles image uploads with strict validation
 */
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Allowed MIME types for image uploads
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = parseInt(process.env.UPLOAD_MAX_SIZE) || 5 * 1024 * 1024; // 5MB
const MAX_FILES = parseInt(process.env.UPLOAD_MAX_FILES) || 5;

// Storage configuration — saves to /uploads with UUID filenames
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', 'uploads'));
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const uniqueName = `${uuidv4()}${ext}`;
        cb(null, uniqueName);
    },
});

// File filter — reject non-image uploads
const fileFilter = (req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file type: ${file.mimetype}. Allowed: ${ALLOWED_TYPES.join(', ')}`), false);
    }
};

// Multer instance for item image uploads (up to 5 images)
const uploadImages = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: MAX_FILES,
    },
}).array('images', MAX_FILES);

// Multer instance for single proof file upload
const uploadProof = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const allowed = [...ALLOWED_TYPES, 'application/pdf'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Invalid file type for proof upload`), false);
        }
    },
    limits: { fileSize: MAX_FILE_SIZE, files: 1 },
}).single('proof');

/**
 * Wrapper to handle Multer errors gracefully
 */
const handleUpload = (uploadFn) => {
    return (req, res, next) => {
        uploadFn(req, res, (err) => {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({ success: false, message: `File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB` });
                }
                if (err.code === 'LIMIT_FILE_COUNT') {
                    return res.status(400).json({ success: false, message: `Too many files. Maximum: ${MAX_FILES}` });
                }
                return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
            }
            if (err) {
                return res.status(400).json({ success: false, message: err.message });
            }
            next();
        });
    };
};

module.exports = {
    uploadImages: handleUpload(uploadImages),
    uploadProof: handleUpload(uploadProof),
};
