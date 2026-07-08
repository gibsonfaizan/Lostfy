/**
 * Claim Model — Database operations for ownership claims and verification
 */
const db = require('../config/db');

const ClaimModel = {
    /**
     * Create a new claim request
     */
    async create({ lost_item_id, found_item_id, claimer_id }) {
        const [result] = await db.query(
            'INSERT INTO claims (lost_item_id, found_item_id, claimer_id) VALUES (?, ?, ?)',
            [lost_item_id || null, found_item_id, claimer_id]
        );
        return result.insertId;
    },

    /**
     * Find claim by ID with related data
     */
    async findById(id) {
        const [rows] = await db.query(
            `SELECT c.*, u.name as claimer_name, u.email as claimer_email, u.trust_score,
              fi.title as found_item_title, fi.image_url as found_item_image
       FROM claims c
       JOIN users u ON c.claimer_id = u.id
       JOIN items fi ON c.found_item_id = fi.id
       WHERE c.id = ?`,
            [id]
        );
        return rows[0] || null;
    },

    /**
     * Update claim status and confidence
     */
    async update(id, { status, confidence_score }) {
        const updates = [];
        const values = [];
        if (status) { updates.push('status = ?'); values.push(status); }
        if (confidence_score !== undefined) { updates.push('confidence_score = ?'); values.push(confidence_score); }
        if (updates.length === 0) return false;
        values.push(id);
        await db.query(`UPDATE claims SET ${updates.join(', ')} WHERE id = ?`, values);
        return true;
    },

    /**
     * Get claims for a specific found item
     */
    async findByFoundItem(foundItemId) {
        const [rows] = await db.query(
            `SELECT c.*, u.name as claimer_name, u.trust_score
       FROM claims c JOIN users u ON c.claimer_id = u.id
       WHERE c.found_item_id = ? ORDER BY c.created_at DESC`,
            [foundItemId]
        );
        return rows;
    },

    /**
     * Get claims by claimer user
     */
    async findByClaimer(userId) {
        const [rows] = await db.query(
            `SELECT c.*, fi.title as item_title, fi.image_url
       FROM claims c JOIN items fi ON c.found_item_id = fi.id
       WHERE c.claimer_id = ? ORDER BY c.created_at DESC`,
            [userId]
        );
        return rows;
    },

    /**
     * Get all claims (admin, paginated)
     */
    async findAll({ page = 1, limit = 20, status }) {
        let sql = `SELECT c.*, u.name as claimer_name, fi.title as item_title
       FROM claims c JOIN users u ON c.claimer_id = u.id JOIN items fi ON c.found_item_id = fi.id WHERE 1=1`;
        const params = [];
        if (status) { sql += ' AND c.status = ?'; params.push(status); }
        sql += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, (page - 1) * limit);
        const [rows] = await db.query(sql, params);
        return rows;
    },

    /* ========== Verification Questions ========== */

    /**
     * Add verification questions to an item
     */
    async addQuestions(itemId, questions) {
        if (!questions || questions.length === 0) return;
        const values = questions.map(q => [itemId, q]);
        await db.query('INSERT INTO verification_questions (item_id, question) VALUES ?', [values]);
    },

    /**
     * Get verification questions for an item
     */
    async getQuestions(itemId) {
        const [rows] = await db.query('SELECT * FROM verification_questions WHERE item_id = ?', [itemId]);
        return rows;
    },

    /**
     * Submit claim answers
     */
    async submitAnswers(claimId, answers) {
        // answers: [{ question_id, answer }]
        const values = answers.map(a => [claimId, a.question_id, a.answer]);
        await db.query('INSERT INTO claim_answers (claim_id, question_id, answer) VALUES ?', [values]);
    },

    /**
     * Get answers for a claim
     */
    async getAnswers(claimId) {
        const [rows] = await db.query(
            `SELECT ca.*, vq.question
       FROM claim_answers ca JOIN verification_questions vq ON ca.question_id = vq.id
       WHERE ca.claim_id = ?`,
            [claimId]
        );
        return rows;
    },

    /* ========== Meetings ========== */

    /**
     * Create a meeting schedule for a verified claim
     */
    async createMeeting({ claim_id, meeting_time, meeting_location, handshake_hash }) {
        const [result] = await db.query(
            'INSERT INTO meetings (claim_id, meeting_time, meeting_location, handshake_hash) VALUES (?, ?, ?, ?)',
            [claim_id, meeting_time, meeting_location, handshake_hash]
        );
        return result.insertId;
    },

    /**
     * Verify meeting handshake hash (QR scan)
     */
    async verifyHandshake(claimId, hash) {
        const [rows] = await db.query(
            'SELECT * FROM meetings WHERE claim_id = ? AND handshake_hash = ? AND status = ?',
            [claimId, hash, 'scheduled']
        );
        if (rows.length > 0) {
            await db.query('UPDATE meetings SET status = ? WHERE id = ?', ['completed', rows[0].id]);
            return true;
        }
        return false;
    },

    /* ========== AI Matches ========== */

    /**
     * Store AI match result
     */
    async addMatch({ lost_item_id, found_item_id, similarity_score }) {
        await db.query(
            'INSERT INTO ai_matches (lost_item_id, found_item_id, similarity_score) VALUES (?, ?, ?)',
            [lost_item_id, found_item_id, similarity_score]
        );
    },

    /**
     * Get AI matches for a lost item
     */
    async getMatches(lostItemId) {
        const [rows] = await db.query(
            `SELECT am.*, fi.title as found_title, fi.image_url, fi.location_text, fi.category
       FROM ai_matches am JOIN items fi ON am.found_item_id = fi.id
       WHERE am.lost_item_id = ? ORDER BY am.similarity_score DESC`,
            [lostItemId]
        );
        return rows;
    },
};

module.exports = ClaimModel;
