/**
 * Auth Controller — Registration, Login, Token Refresh, OTP, Password Reset
 */
const jwt = require('jsonwebtoken');
const UserModel = require('../models/userModel');
const { OTPModel } = require('../models/notificationModel');

/**
 * Generate JWT access and refresh tokens
 */
const generateTokens = (user) => {
    const accessToken = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );
    const refreshToken = jwt.sign(
        { id: user.id },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );
    return { accessToken, refreshToken };
};

/**
 * Generate 6-digit OTP
 */
const generateOTP = () => String(Math.floor(100000 + Math.random() * 900000));

/* ========== Register ========== */
exports.register = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;

        // Check if user exists
        const existing = await UserModel.findByEmail(email);
        if (existing) {
            return res.status(409).json({ success: false, message: 'Email already registered' });
        }

        // Create user
        const userId = await UserModel.create({ name, email, password });
        const user = await UserModel.findById(userId);
        const tokens = generateTokens(user);

        res.status(201).json({
            success: true,
            message: 'Registration successful',
            data: { user, ...tokens },
        });
    } catch (err) { next(err); }
};

/* ========== Login ========== */
exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await UserModel.findByEmail(email);
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        // Compare password
        const isMatch = await UserModel.comparePassword(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        const tokens = generateTokens(user);
        const { password: _, ...safeUser } = user;

        res.json({
            success: true,
            message: 'Login successful',
            data: { user: safeUser, ...tokens },
        });
    } catch (err) { next(err); }
};

/* ========== Refresh Token ========== */
exports.refreshToken = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ success: false, message: 'Refresh token required' });
        }

        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        const user = await UserModel.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ success: false, message: 'User not found' });
        }

        const tokens = generateTokens(user);
        res.json({ success: true, data: tokens });
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    }
};

/* ========== Get Profile ========== */
exports.getProfile = async (req, res, next) => {
    try {
        const user = await UserModel.findById(req.user.id);
        res.json({ success: true, data: user });
    } catch (err) { next(err); }
};

/* ========== Update Profile ========== */
exports.updateProfile = async (req, res, next) => {
    try {
        const { name, password } = req.body;
        const fields = {};
        if (name) fields.name = name;
        if (password) fields.password = password;

        await UserModel.update(req.user.id, fields);
        const user = await UserModel.findById(req.user.id);
        res.json({ success: true, message: 'Profile updated', data: user });
    } catch (err) { next(err); }
};

/* ========== Send OTP ========== */
exports.sendOTP = async (req, res, next) => {
    try {
        const { email } = req.body;
        const otp = generateOTP();
        await OTPModel.create(email, otp, 10);

        // In production, send via email/SMS. Here we return it for demo.
        console.log(`📧 OTP for ${email}: ${otp}`);

        res.json({
            success: true,
            message: 'OTP sent successfully',
            // Remove otp from response in production!
            ...(process.env.NODE_ENV === 'development' && { otp }),
        });
    } catch (err) { next(err); }
};

/* ========== Verify OTP ========== */
exports.verifyOTP = async (req, res, next) => {
    try {
        const { email, otp } = req.body;
        const isValid = await OTPModel.verify(email, otp);
        if (!isValid) {
            return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
        }
        res.json({ success: true, message: 'OTP verified successfully' });
    } catch (err) { next(err); }
};

/* ========== Forgot Password ========== */
exports.forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        const user = await UserModel.findByEmail(email);
        if (!user) {
            // Don't reveal whether user exists
            return res.json({ success: true, message: 'If this email is registered, you will receive an OTP' });
        }

        const otp = generateOTP();
        await OTPModel.create(email, otp, 10);
        console.log(`🔑 Password Reset OTP for ${email}: ${otp}`);

        res.json({
            success: true,
            message: 'If this email is registered, you will receive an OTP',
            ...(process.env.NODE_ENV === 'development' && { otp }),
        });
    } catch (err) { next(err); }
};

/* ========== Reset Password (using OTP) ========== */
exports.resetPassword = async (req, res, next) => {
    try {
        const { email, otp, newPassword } = req.body;
        const isValid = await OTPModel.verify(email, otp);
        if (!isValid) {
            return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
        }

        const user = await UserModel.findByEmail(email);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        await UserModel.update(user.id, { password: newPassword });
        res.json({ success: true, message: 'Password reset successful' });
    } catch (err) { next(err); }
};
