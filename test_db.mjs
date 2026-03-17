
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
    console.log('Testing connection to:', process.env.DATABASE_URL);
    try {
        const connection = await mysql.createConnection(process.env.DATABASE_URL);
        console.log('SUCCESS');
        await connection.end();
    } catch (e) {
        console.error('FAILED:', e.message);
    }
}
test();
