import pool from '../config/database';

const run = async () => {
    const drops = [
        "DROP TABLE IF EXISTS test_case_results;",
        "DROP TABLE IF EXISTS user_submissions;",
        "DROP TABLE IF EXISTS session_questions;",
        "DROP TABLE IF EXISTS practice_sessions;",
        "DROP TABLE IF EXISTS user_progress;",
        "DROP TABLE IF EXISTS user_statistics;",
        "DROP TABLE IF EXISTS test_cases;",
        "DROP TABLE IF EXISTS mcq_options;",
        //"DROP TABLE IF EXISTS questions;", // Keep questions to avoid cascading too much? No, must drop all to be safe.
        // Actually, let's just try to CREATE the new tables to see if they fail.
        // But dependencies matter.
        "DROP TABLE IF EXISTS skill_practice_attempts;",
        "DROP TABLE IF EXISTS skill_mastery_history;",
        "DROP TABLE IF EXISTS user_skill_mastery;",
        "DROP TABLE IF EXISTS level_skills;",
        "DROP TABLE IF EXISTS skill_prerequisites;",
        "DROP TABLE IF EXISTS skills;"
    ];

    for (const sql of drops) {
        try {
            await pool.query(sql);
            console.log(`Success: ${sql}`);
        } catch (e: any) {
            console.error(`Failed: ${sql}`, e.message);
        }
    }

    const creates = [
        `CREATE TABLE IF NOT EXISTS skills (
            id CHAR(36) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            category VARCHAR(100),
            difficulty_tier VARCHAR(20) DEFAULT 'beginner',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            CHECK (difficulty_tier IN ('beginner', 'intermediate', 'advanced'))
        );`,
        `CREATE TABLE IF NOT EXISTS skill_prerequisites (
            id CHAR(36) PRIMARY KEY,
            skill_id CHAR(36) NOT NULL,
            prerequisite_skill_id CHAR(36) NOT NULL,
            relationship_type VARCHAR(20) DEFAULT 'required',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CHECK (relationship_type IN ('required', 'recommended', 'optional')),
            FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
            FOREIGN KEY (prerequisite_skill_id) REFERENCES skills(id) ON DELETE CASCADE
        );`,
        // Ensure levels table exists for level_skills
        // We assume levels exists or we need to create it.
        // But for this test, let's just test Skills and UserSkillMastery which don't depend on Levels (UserSkillMastery depends on Users and Skills)
        `CREATE TABLE IF NOT EXISTS user_skill_mastery (
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
        );`,
        `CREATE TABLE IF NOT EXISTS skill_mastery_history (
            id CHAR(36) PRIMARY KEY,
            user_id CHAR(36) NOT NULL,
            skill_id CHAR(36) NOT NULL,
            previous_score DECIMAL(5,2) NOT NULL,
            new_score DECIMAL(5,2) NOT NULL,
            delta DECIMAL(5,2) NOT NULL,
            source_session_id CHAR(36),
            activity_type VARCHAR(50) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
        );`
    ];

    for (const sql of creates) {
        try {
            await pool.query(sql);
            console.log(`Success: Created table`);
        } catch (e: any) {
            console.error(`Failed to create table:`, e.message);
            console.error(sql);
        }
    }
    process.exit(0);
};

run();
