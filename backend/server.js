/**
 * LostFy Backend — Main Server Entry Point
 * Express.js with security middleware, routes, and error handling
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const itemRoutes = require('./routes/itemRoutes');
const claimRoutes = require('./routes/claimRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const adminRoutes = require('./routes/adminRoutes');
const recommendationRoutes = require('./routes/recommendationRoutes');

const { errorHandler } = require('./middleware/errorMiddleware');
const db = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

/* ========== Security Middleware ========== */
// Helmet for HTTP header security
app.use(helmet());

// CORS — allow frontend origin
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:5500', 'http://localhost:5500'],
    credentials: true,
}));

// Rate limiting — prevent abuse
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
    message: { success: false, message: 'Too many requests. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

/* ========== Body Parsing ========== */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/* ========== Static Files ========== */
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/* ========== API Routes ========== */
app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/recommendations', recommendationRoutes);

/* ========== Health Check ========== */
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'LostFy API is running',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
    });
});

/* ========== 404 Handler ========== */
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Endpoint not found' });
});

/* ========== Global Error Handler ========== */
app.use(errorHandler);

/* ========== Start Server ========== */
app.listen(PORT, () => {
    console.log(`\n🚀 LostFy Backend running on http://localhost:${PORT}`);
    console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}\n`);
});

module.exports = app;
