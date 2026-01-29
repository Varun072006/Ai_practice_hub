
import pool from '../config/database';

const verify = async () => {
    try {
        console.log('Verifying Data Science Course Levels...');
        const [rows]: any = await pool.query(
            'SELECT level_number, title, topic_description FROM levels WHERE course_id = ? ORDER BY level_number',
            ['550e8400-e29b-41d4-a716-446655440004']
        );
        console.log('Found levels:', rows.length);
        rows.forEach((row: any) => {
            console.log(`Level ${row.level_number}: ${row.title}`);
        });
        process.exit(0);
    } catch (error) {
        console.error('Verification failed:', error);
        process.exit(1);
    }
};

verify();
