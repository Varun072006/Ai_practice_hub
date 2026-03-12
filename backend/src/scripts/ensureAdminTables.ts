import pool from '../config/database';

const ensureAdminTables = async () => {
    try {
        console.log('Checking and creating admin tables if needed...');

        // 1. Assignments table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS assignments (
                id CHAR(36) PRIMARY KEY,
                admin_id CHAR(36) NOT NULL,
                title VARCHAR(255) NOT NULL,
                course_id CHAR(36) NOT NULL,
                level_id CHAR(36) NOT NULL,
                target_type VARCHAR(50) NOT NULL, -- 'all', 'department', 'year', 'user'
                target_value VARCHAR(255), -- 'CSE', '3', or user_id
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
                FOREIGN KEY (level_id) REFERENCES levels(id) ON DELETE CASCADE
            )
        `);
        console.log('- assignments table ensured');

        // 2. Student Tasks table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS student_tasks (
                id CHAR(36) PRIMARY KEY,
                user_id CHAR(36) NOT NULL,
                assignment_id CHAR(36) NOT NULL,
                status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed'
                completed_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE
            )
        `);
        console.log('- student_tasks table ensured');

        console.log('Admin tables check completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Failed to ensure admin tables:', error);
        process.exit(1);
    }
};

ensureAdminTables();
