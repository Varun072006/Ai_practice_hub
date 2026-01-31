import pool from '../config/database';

const applySchemaChanges = async () => {
    try {
        console.log('Applying schema changes to database...');

        // 1. Add columns to users table
        try {
            await pool.query(`ALTER TABLE users ADD COLUMN department VARCHAR(100)`);
            console.log('Added department column to users table');
        } catch (error: any) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('department column already exists');
            } else {
                console.error('Error adding department column:', error.message);
            }
        }

        try {
            await pool.query(`ALTER TABLE users ADD COLUMN year INTEGER`);
            console.log('Added year column to users table');
        } catch (error: any) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('year column already exists');
            } else {
                console.error('Error adding year column:', error.message);
            }
        }

        // 2. Create assignments table
        try {
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
            console.log('Created assignments table');
        } catch (error: any) {
            console.error('Error creating assignments table:', error.message);
        }

        // 3. Create student_tasks table
        try {
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
            console.log('Created student_tasks table');
        } catch (error: any) {
            console.error('Error creating student_tasks table:', error.message);
        }

        console.log('Schema changes applied successfully.');
        process.exit(0);

    } catch (error) {
        console.error('Failed to apply schema changes:', error);
        process.exit(1);
    }
};

applySchemaChanges();
