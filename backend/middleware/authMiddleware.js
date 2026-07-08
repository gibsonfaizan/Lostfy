/**
 * JWT Authentication Middleware
 * Verifies access tokens and extracts user data
 */
const jwt = require('jsonwebtoken');
const db = require('../config/db');

/**
 * Protect routes — require valid JWT token
 */
const protect = async (req, res, next) => {
    try {
        let token;

        // Extract token from Authorization header
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({ success: false, message: 'Not authorized — no token provided' });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Fetch user from database to ensure they still exist
        const [rows] = await db.query('SELECT id, name, email, role, trust_score FROM users WHERE id = ?', [decoded.id]);

        if (rows.length === 0) {
            return res.status(401).json({ success: false, message: 'User no longer exists' });
        }

        // Attach user to request object
        req.user = rows[0];
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Token expired — please login again' });
        }
        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({ success: false, message: 'Invalid token' });
        }
        return res.status(500).json({ success: false, message: 'Authentication error' });
    }
};

/**
 * Role-based access control
 * @param  {...string} roles - Allowed roles (e.g., 'admin', 'user', 'finder')
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Not authenticated' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Insufficient permissions for this action' });
        }
        next();
    };
};

/**
 * Optional auth — attaches user if token present, but doesn't block
 */
const optionalAuth = async (req, res, next) => {
    try {
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            const token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const [rows] = await db.query('SELECT id, name, email, role, trust_score FROM users WHERE id = ?', [decoded.id]);
            if (rows.length > 0) req.user = rows[0];
        }
    } catch {
        // Silently continue without user
    }
    next();
};

module.exports = { protect, authorize, optionalAuth };
