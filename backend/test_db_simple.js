const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mysql = require('mysql2/promise');

async function run() {
    console.log('Connecting...');
    try {
        // Parse URL to handle SSL if needed, similar to database.ts essentially
        // But for simplicity, let's just use the URL if mysql2 handles it (it usually does)
        // Note: database.ts had complex SSL logic. using the URL might fail if TiDB requires SSL ca
        // For TiDB cloud, it usually requires SSL.
        // Let's rely on the DATABASE_URL in .env

        let config = process.env.DATABASE_URL;
        if (!config) {
            console.error('No DATABASE_URL');
            process.exit(1);
        }

        // Add ssl params if needed or just pass object
        // For quick test, attempt direct connection
        const connection = await mysql.createConnection(config);

        console.log('Connected.');

        await connection.query('DROP TABLE IF EXISTS test_skill_simple');
        console.log('Dropped table.');

        await connection.query(`
            CREATE TABLE test_skill_simple (
                id CHAR(36) PRIMARY KEY,
                name VARCHAR(255)
            )
        `);
        console.log('Created simple table.');

        await connection.query(`
           CREATE TABLE IF NOT EXISTS test_user_skill_mastery (
            id CHAR(36) PRIMARY KEY,
            user_id CHAR(36) NOT NULL,
            skill_id CHAR(36) NOT NULL,
            mastery_score DECIMAL(5,2) DEFAULT 0.00,
            UNIQUE KEY unique_user_skill (user_id, skill_id)
        );
        `);
        console.log('Created complex unique key table.');

        await connection.end();
    } catch (e) {
        console.error('Error:', e.message);
        console.error('Code:', e.code);
        console.error('SQLState:', e.sqlState);
        process.exit(1);
    }
}

run();
