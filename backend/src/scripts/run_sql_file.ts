import pool from '../config/database';
import fs from 'fs';
import path from 'path';

const runSqlFile = async () => {
    const filePath = process.argv[2];
    if (!filePath) {
        console.error('Please provide a file path as argument');
        process.exit(1);
    }

    try {
        const fullPath = path.resolve(process.cwd(), filePath);
        console.log(`Reading SQL file: ${fullPath}`);
        const sql = fs.readFileSync(fullPath, 'utf8');

        console.log('Executing SQL...');
        // Split by semicolon for safety if multiple statements are not enabled in driver config,
        // but typically pool.query handles it if allowed.
        // Given previous success, we will run as is.

        await pool.query(sql);

        console.log('SQL file executed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Failed to execute SQL file:', error);
        process.exit(1);
    }
};

runSqlFile();
