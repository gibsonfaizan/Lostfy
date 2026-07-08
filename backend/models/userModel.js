/**
 * User Model — Database operations for user accounts
 */
const db = require('../config/db');
const bcrypt = require('bcryptjs');

const UserModel = {
    /**
     * Create a new user with hashed password
     */
    async create({ name, email, password, role = 'user' }) {
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);
        const [result] = await db.query(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            [name, email, hashedPassword, role]
        );
        return result.insertId;
    },

    /**
     * Find user by email
     */
    async findByEmail(email) {
        const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        return rows[0] || null;
    },

    /**
     * Find user by ID (excludes password)
     */
    async findById(id) {
        const [rows] = await db.query(
            'SELECT id, name, email, role, trust_score, created_at, updated_at FROM users WHERE id = ?',
            [id]
        );
        return rows[0] || null;
    },

    /**
     * Compare submitted password with stored hash
     */
    async comparePassword(inputPassword, hashedPassword) {
        return bcrypt.compare(inputPassword, hashedPassword);
    },

    /**
     * Update user profile fields
     */
    async update(id, fields) {
        const allowed = ['name', 'password', 'role', 'trust_score'];
        const updates = [];
        const values = [];

        for (const [key, value] of Object.entries(fields)) {
            if (allowed.includes(key)) {
                if (key === 'password') {
                    const salt = await bcrypt.genSalt(12);
                    values.push(await bcrypt.hash(value, salt));
                } else {
                    values.push(value);
                }
                updates.push(`${key} = ?`);
            }
        }

        if (updates.length === 0) return false;
        values.push(id);
        await db.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
        return true;
    },

    /**
     * Update trust score for a user
     */
    async updateTrustScore(id, delta) {
        await db.query(
            'UPDATE users SET trust_score = LEAST(100, GREATEST(0, trust_score + ?)) WHERE id = ?',
            [delta, id]
        );
    },

    /**
     * Get all users (admin)
     */
    async findAll({ page = 1, limit = 20 }) {
        const offset = (page - 1) * limit;
        const [rows] = await db.query(
            'SELECT id, name, email, role, trust_score, created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?',
            [limit, offset]
        );
        const [[{ total }]] = await db.query('SELECT COUNT(*) as total FROM users');
        return { users: rows, total, page, limit };
    },
};

module.exports = UserModel;
