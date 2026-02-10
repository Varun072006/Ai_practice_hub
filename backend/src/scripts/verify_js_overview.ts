/**
 * Verify JavaScript Course Overview Data
 * Checks that the overview and learning materials were properly seeded.
 */

import pool from '../config/database';
import { getRows } from '../utils/mysqlHelper';

async function verify() {
    try {
        console.log('🔍 Verifying JavaScript Course Overview...\n');

        // Check course overview
        const courseResult = await pool.query(
            "SELECT id, title, overview, total_levels FROM courses WHERE LOWER(title) LIKE '%javascript%'"
        );
        const courses = getRows(courseResult);

        if (courses.length === 0) {
            console.error('❌ No JavaScript course found!');
            process.exit(1);
        }

        const course = courses[0];
        console.log(`📘 Course: "${course.title}"`);
        console.log(`   ID: ${course.id}`);
        console.log(`   Total Levels: ${course.total_levels}`);
        console.log(`   Overview: ${course.overview ? `✅ (${course.overview.length} chars)` : '❌ MISSING'}`);
        if (course.overview) {
            console.log(`   Preview: "${course.overview.substring(0, 80)}..."`);
        }

        // Check levels
        const levelsResult = await pool.query(
            'SELECT id, level_number, title, learning_materials FROM levels WHERE course_id = ? ORDER BY level_number',
            [course.id]
        );
        const levels = getRows(levelsResult);

        console.log(`\n📊 Levels: ${levels.length} found`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        for (const level of levels) {
            console.log(`\n  Level ${level.level_number}: "${level.title}"`);

            if (!level.learning_materials) {
                console.log('    ❌ No learning_materials');
                continue;
            }

            let materials: any;
            try {
                materials = typeof level.learning_materials === 'string'
                    ? JSON.parse(level.learning_materials)
                    : level.learning_materials;
            } catch (e) {
                console.log('    ❌ Invalid JSON in learning_materials');
                continue;
            }

            const intro = materials.introduction ? `✅ (${materials.introduction.length} chars)` : '❌';
            const concepts = materials.concepts ? `✅ (${materials.concepts.length} items)` : '❌';
            const keyTerms = materials.key_terms ? `✅ (${materials.key_terms.length} items)` : '❌';
            const resources = materials.resources ? `✅ (${materials.resources.length} items)` : '❌';
            const code = materials.example_code ? `✅ (${materials.example_code.length} chars)` : '❌';

            console.log(`    Introduction:  ${intro}`);
            console.log(`    Concepts:      ${concepts}`);
            if (materials.concepts) {
                materials.concepts.forEach((c: any, i: number) => {
                    console.log(`      ${i + 1}. ${c.title}`);
                });
            }
            console.log(`    Key Terms:     ${keyTerms}`);
            console.log(`    Resources:     ${resources}`);
            console.log(`    Example Code:  ${code}`);
        }

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✨ Verification complete!');
        process.exit(0);
    } catch (error: any) {
        console.error('❌ Verification failed:', error.message);
        process.exit(1);
    }
}

verify();
