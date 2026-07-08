/**
 * Request Validation Middleware
 * Uses express-validator for input sanitization and validation
 */
const { body, param, query, validationResult } = require('express-validator');

/**
 * Process validation results — return 400 if errors exist
 */
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array().map(e => ({ field: e.path, message: e.msg })),
        });
    }
    next();
};

/* ========== Auth Validators ========== */
const registerRules = [
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 255 }),
    body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];

const loginRules = [
    body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
];

/* ========== Item Validators ========== */
const createItemRules = [
    body('type').isIn(['lost', 'found']).withMessage('Type must be "lost" or "found"'),
    body('category').isIn(['electronics', 'documents', 'wallets_bags', 'keys', 'accessories', 'others']).withMessage('Invalid category'),
    body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 255 }),
    body('description').optional().trim().isLength({ max: 5000 }),
    body('location_lat').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
    body('location_lng').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
    body('location_text').optional().trim().isLength({ max: 255 }),
];

/* ========== Claim Validators ========== */
const createClaimRules = [
    body('found_item_id').isInt({ min: 1 }).withMessage('Valid found item ID required'),
    body('lost_item_id').optional().isInt({ min: 1 }),
];

const submitAnswerRules = [
    body('answers').isArray({ min: 1 }).withMessage('Answers array is required'),
    body('answers.*.question_id').isInt({ min: 1 }).withMessage('Valid question ID required'),
    body('answers.*.answer').trim().notEmpty().withMessage('Answer cannot be empty'),
];

/* ========== OTP Validators ========== */
const otpSendRules = [
    body('email').trim().isEmail().withMessage('Valid email is required'),
];

const otpVerifyRules = [
    body('email').trim().isEmail().withMessage('Valid email is required'),
    body('otp').trim().isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
];

module.exports = {
    validate,
    registerRules,
    loginRules,
    createItemRules,
    createClaimRules,
    submitAnswerRules,
    otpSendRules,
    otpVerifyRules,
};
