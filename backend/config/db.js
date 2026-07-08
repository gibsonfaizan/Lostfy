/**
 * MySQL Database Connection Pool
 * Uses mysql2 promise-based pool for async/await support
 */
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lostfy',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
});

// Test connection on startup
(async () => {
    try {
        const conn = await pool.getConnection();
        console.log('✅ MySQL connected successfully');
        conn.release();
    } catch (err) {
        console.error('❌ MySQL connection failed:', err.message);
        console.log('⚠️  Server will continue — database operations will fail until MySQL is available');
    }
})();

module.exports = pool;
