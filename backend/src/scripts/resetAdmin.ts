
import pool from '../config/database';
import { hashPassword } from '../utils/password';
import { randomUUID } from 'crypto';

const resetAdmin = async () => {
    try {
        const passwordStart = await hashPassword('123');
        console.log('Resetting ADMIN password to "123"...');

        // Check if admin exists
        const [rows]: any = await pool.query('SELECT id FROM users WHERE username = "ADMIN"');

        if (rows.length > 0) {
            await pool.query('UPDATE users SET password_hash = ? WHERE username = "ADMIN"', [passwordStart]);
            console.log('ADMIN password updated.');
        } else {
            const adminId = randomUUID();
            await pool.query(
                'INSERT INTO users (id, username, password_hash, role, name) VALUES (?, ?, ?, ?, ?)',
                [adminId, 'ADMIN', passwordStart, 'admin', 'Admin User']
            );
            console.log('ADMIN user created with password "123".');
        }

        process.exit(0);
    } catch (err) {
        console.error('Failed to reset admin:', err);
        process.exit(1);
    }
};

resetAdmin();
