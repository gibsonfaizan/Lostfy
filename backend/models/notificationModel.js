/**
 * Notification Model — Database operations for in-app notifications
 */
const db = require('../config/db');

const NotificationModel = {
    /**
     * Create a notification for a user
     */
    async create({ user_id, title, message }) {
        const [result] = await db.query(
            'INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)',
            [user_id, title, message]
        );
        return result.insertId;
    },

    /**
     * Get all notifications for a user
     */
    async findByUser(userId, { unreadOnly = false, limit = 50 } = {}) {
        let sql = 'SELECT * FROM notifications WHERE user_id = ?';
        const params = [userId];
        if (unreadOnly) { sql += ' AND is_read = 0'; }
        sql += ' ORDER BY created_at DESC LIMIT ?';
        params.push(limit);
        const [rows] = await db.query(sql, params);
        return rows;
    },

    /**
     * Mark a notification as read
     */
    async markRead(id, userId) {
        await db.query('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [id, userId]);
    },

    /**
     * Mark all notifications as read for a user
     */
    async markAllRead(userId) {
        await db.query('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0', [userId]);
    },

    /**
     * Get unread count
     */
    async getUnreadCount(userId) {
        const [[{ count }]] = await db.query(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
            [userId]
        );
        return count;
    },
};

/* ========== OTP Model ========== */
const OTPModel = {
    /**
     * Create OTP entry
     */
    async create(email, otpCode, expiresInMinutes = 10) {
        const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
        await db.query(
            'INSERT INTO otps (email, otp_code, expires_at) VALUES (?, ?, ?)',
            [email, otpCode, expiresAt]
        );
    },

    /**
     * Verify and consume OTP
     */
    async verify(email, otpCode) {
        const [rows] = await db.query(
            'SELECT * FROM otps WHERE email = ? AND otp_code = ? AND is_used = 0 AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
            [email, otpCode]
        );
        if (rows.length === 0) return false;
        await db.query('UPDATE otps SET is_used = 1 WHERE id = ?', [rows[0].id]);
        return true;
    },

    /**
     * Cleanup expired OTPs
     */
    async cleanup() {
        await db.query('DELETE FROM otps WHERE expires_at < NOW() OR is_used = 1');
    },
};

/* ========== Admin Log Model ========== */
const AdminLogModel = {
    async create({ admin_id, action, details }) {
        await db.query(
            'INSERT INTO admin_logs (admin_id, action, details) VALUES (?, ?, ?)',
            [admin_id, action, details]
        );
    },

    async findAll({ page = 1, limit = 50 }) {
        const offset = (page - 1) * limit;
        const [rows] = await db.query(
            `SELECT al.*, u.name as admin_name
       FROM admin_logs al JOIN users u ON al.admin_id = u.id
       ORDER BY al.created_at DESC LIMIT ? OFFSET ?`,
            [limit, offset]
        );
        return rows;
    },
};

module.exports = { NotificationModel, OTPModel, AdminLogModel };
