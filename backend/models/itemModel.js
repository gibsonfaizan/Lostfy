/**
 * Item Model — Database operations for lost/found items
 */
const db = require('../config/db');

const ItemModel = {
    /**
     * Create a new lost or found item report
     */
    async create({ user_id, type, category, title, description, location_lat, location_lng, location_text, image_url, ai_tags, ocr_text }) {
        const [result] = await db.query(
            `INSERT INTO items (user_id, type, category, title, description, location_lat, location_lng, location_text, image_url, ai_tags, ocr_text)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [user_id, type, category, title, description, location_lat, location_lng, location_text, image_url, JSON.stringify(ai_tags || []), ocr_text || null]
        );
        return result.insertId;
    },

    /**
     * Find item by ID
     */
    async findById(id) {
        const [rows] = await db.query(
            `SELECT i.*, u.name as user_name, u.email as user_email
       FROM items i JOIN users u ON i.user_id = u.id WHERE i.id = ?`, [id]
        );
        return rows[0] || null;
    },

    /**
     * Update item fields
     */
    async update(id, fields) {
        const allowed = ['category', 'title', 'description', 'location_lat', 'location_lng', 'location_text', 'image_url', 'status', 'ai_tags', 'ocr_text'];
        const updates = [];
        const values = [];

        for (const [key, value] of Object.entries(fields)) {
            if (allowed.includes(key)) {
                updates.push(`${key} = ?`);
                values.push(key === 'ai_tags' ? JSON.stringify(value) : value);
            }
        }

        if (updates.length === 0) return false;
        values.push(id);
        await db.query(`UPDATE items SET ${updates.join(', ')} WHERE id = ?`, values);
        return true;
    },

    /**
     * Delete an item
     */
    async delete(id) {
        const [result] = await db.query('DELETE FROM items WHERE id = ?', [id]);
        return result.affectedRows > 0;
    },

    /**
     * Search items with filters (category, type, status, text, location radius)
     */
    async search({ type, category, status, query, lat, lng, radius_km = 10, page = 1, limit = 20 }) {
        let sql = `SELECT i.*, u.name as user_name,
      (CASE WHEN ? IS NOT NULL AND ? IS NOT NULL THEN
        (6371 * acos(cos(radians(?)) * cos(radians(location_lat)) * cos(radians(location_lng) - radians(?)) + sin(radians(?)) * sin(radians(location_lat))))
      ELSE NULL END) as distance
      FROM items i JOIN users u ON i.user_id = u.id WHERE 1=1`;
        const params = [lat, lng, lat, lng, lat];

        if (type) { sql += ' AND i.type = ?'; params.push(type); }
        if (category) { sql += ' AND i.category = ?'; params.push(category); }
        if (status) { sql += ' AND i.status = ?'; params.push(status); }
        if (query) {
            sql += ' AND (i.title LIKE ? OR i.description LIKE ? OR i.location_text LIKE ?)';
            const q = `%${query}%`;
            params.push(q, q, q);
        }

        // Location radius filter using Haversine formula
        if (lat && lng && radius_km) {
            sql += ` HAVING (distance IS NULL OR distance <= ?)`;
            params.push(radius_km);
        }

        sql += ' ORDER BY i.created_at DESC';

        const offset = (page - 1) * limit;
        sql += ' LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const [rows] = await db.query(sql, params);
        return rows;
    },

    /**
     * Find items nearby a given location
     */
    async findNearby(lat, lng, radius_km = 10, limit = 20) {
        const [rows] = await db.query(
            `SELECT i.*, u.name as user_name,
        (6371 * acos(cos(radians(?)) * cos(radians(location_lat)) * cos(radians(location_lng) - radians(?)) + sin(radians(?)) * sin(radians(location_lat)))) AS distance
       FROM items i JOIN users u ON i.user_id = u.id
       WHERE i.status = 'active'
       HAVING distance <= ?
       ORDER BY distance ASC
       LIMIT ?`,
            [lat, lng, lat, radius_km, limit]
        );
        return rows;
    },

    /**
     * Get items by user ID
     */
    async findByUser(userId, type) {
        let sql = 'SELECT * FROM items WHERE user_id = ?';
        const params = [userId];
        if (type) { sql += ' AND type = ?'; params.push(type); }
        sql += ' ORDER BY created_at DESC';
        const [rows] = await db.query(sql, params);
        return rows;
    },

    /**
     * Get all items (admin, paginated)
     */
    async findAll({ page = 1, limit = 20, type, status }) {
        let sql = 'SELECT i.*, u.name as user_name FROM items i JOIN users u ON i.user_id = u.id WHERE 1=1';
        const params = [];
        if (type) { sql += ' AND i.type = ?'; params.push(type); }
        if (status) { sql += ' AND i.status = ?'; params.push(status); }
        sql += ' ORDER BY i.created_at DESC LIMIT ? OFFSET ?';
        const offset = (page - 1) * limit;
        params.push(limit, offset);
        const [rows] = await db.query(sql, params);
        const [[{ total }]] = await db.query('SELECT COUNT(*) as total FROM items');
        return { items: rows, total, page, limit };
    },

    /**
     * Get platform statistics (admin)
     */
    async getStats() {
        const [[stats]] = await db.query(`
      SELECT
        COUNT(*) as total_items,
        SUM(CASE WHEN type = 'lost' THEN 1 ELSE 0 END) as total_lost,
        SUM(CASE WHEN type = 'found' THEN 1 ELSE 0 END) as total_found,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_items,
        SUM(CASE WHEN status = 'claimed' THEN 1 ELSE 0 END) as claimed_items,
        SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed_items
      FROM items
    `);
        return stats;
    },
};

module.exports = ItemModel;
