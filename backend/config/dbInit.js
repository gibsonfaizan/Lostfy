/**
 * Database Initialization Script
 * Reads schema.sql and creates all tables in MySQL
 * Run: node config/dbInit.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function initDatabase() {
    console.log('🔧 LostFy Database Init Script');
    console.log('------------------------------');

    let connection;
    try {
        // Connect without specifying database first
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT) || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            multipleStatements: true,
        });

        console.log('✅ Connected to MySQL server');

        // Read the schema file
        const schemaPath = path.join(__dirname, '..', '..', 'database', 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf-8');

        console.log('📄 Loaded schema.sql');

        // Execute schema
        await connection.query(schema);
        console.log('✅ All tables created successfully');

        // Seed admin user (if not exists)
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash('admin123', 12);

        await connection.query(`USE lostfy`);
        await connection.query(
            `INSERT IGNORE INTO users (name, email, password, role, trust_score) VALUES (?, ?, ?, ?, ?)`,
            ['Admin User', 'admin@lostfy.io', hashedPassword, 'admin', 100.00]
        );
        console.log('👤 Admin user seeded (admin@lostfy.io / admin123)');

        // Seed a demo user
        const demoPassword = await bcrypt.hash('demo1234', 12);
        await connection.query(
            `INSERT IGNORE INTO users (name, email, password, role, trust_score) VALUES (?, ?, ?, ?, ?)`,
            ['Demo User', 'demo@lostfy.io', demoPassword, 'user', 92.50]
        );
        console.log('👤 Demo user seeded (demo@lostfy.io / demo1234)');

        console.log('\n🎉 Database initialized successfully!');
    } catch (err) {
        console.error('❌ Init failed:', err.message);
        process.exit(1);
    } finally {
        if (connection) await connection.end();
    }
}

initDatabase();
