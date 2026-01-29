const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mysql = require('mysql2/promise');

async function run() {
    console.log('Connecting with SSL...');
    try {
        let config = process.env.DATABASE_URL;
        let ssl = undefined;

        // Load CA
        try {
            const caPath = path.join(__dirname, 'tidb-ca.pem');
            if (fs.existsSync(caPath)) {
                ssl = {
                    ca: fs.readFileSync(caPath),
                    rejectUnauthorized: true
                };
                console.log('Loaded CA cert');
            } else {
                // Try parsing URL for special handling if needed or just rely on global defaults
                // TiDB Cloud often needs the CA.
                console.log('CA cert not found at ' + caPath);
                ssl = { rejectUnauthorized: false }; // Insecure fallback attempt
            }
        } catch (e) {
            console.error('Error loading CA:', e);
        }

        const connection = await mysql.createConnection({
            uri: config,
            ssl: ssl,
            multipleStatements: true
        });

        console.log('Connected.');

        // Test 1: Create Skills Table
        console.log('Replacing Skills table...');
        await connection.query('DROP TABLE IF EXISTS skills FORCE'); // FORCE for TiDB? No.
        // Drop dependent tables first to be clean
        await connection.query('DROP TABLE IF EXISTS user_skill_mastery');
        await connection.query('DROP TABLE IF EXISTS skill_mastery_history');
        await connection.query('DROP TABLE IF EXISTS skills');

        await connection.query(`
           CREATE TABLE skills (
            id CHAR(36) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            category VARCHAR(100),
            difficulty_tier VARCHAR(20) DEFAULT 'beginner',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            CHECK (difficulty_tier IN ('beginner', 'intermediate', 'advanced'))
        );
        `);
        console.log('Created skills table.');

        // Test 2: Create UserSkillMastery
        console.log('Creating user_skill_mastery...');
        await connection.query(`
           CREATE TABLE user_skill_mastery (
            id CHAR(36) PRIMARY KEY,
            user_id CHAR(36) NOT NULL,
            skill_id CHAR(36) NOT NULL,
            mastery_score DECIMAL(5,2) DEFAULT 0.00,
            total_practice_count INTEGER DEFAULT 0,
            successful_practice_count INTEGER DEFAULT 0,
            last_practiced_at TIMESTAMP NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_user_skill (user_id, skill_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
        );
        `);
        console.log('Created user_skill_mastery table.');

        await connection.end();
    } catch (e) {
        console.error('FAILED.');
        console.error('Message:', e.message);
        console.error('Code:', e.code);
        console.error('SQLState:', e.sqlState);
        process.exit(1);
    }
}

run();
