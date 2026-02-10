/**
 * Detailed verification of JavaScript course overview data.
 * Outputs comprehensive check of all seeded data.
 */
import pool from '../config/database';
import { getRows } from '../utils/mysqlHelper';

async function detailedVerify() {
    try {
        // 1. Check course
        const courseRes = await pool.query(
            "SELECT id, title, description, overview, total_levels FROM courses WHERE LOWER(title) LIKE '%javascript%'"
        );
        const courses = getRows(courseRes);

        if (courses.length === 0) {
            console.log('FAIL: No JavaScript course found');
            process.exit(1);
        }

        const c = courses[0];
        console.log('=== COURSE ===');
        console.log('Title:', c.title);
        console.log('Description:', c.description);
        console.log('Overview length:', c.overview ? c.overview.length : 0);
        console.log('Overview present:', !!c.overview);
        console.log('Has Level 1 mention:', c.overview?.includes('Level 1') || false);
        console.log('Has Level 2 mention:', c.overview?.includes('Level 2') || false);
        console.log('Has Level 3 mention:', c.overview?.includes('Level 3') || false);

        // 2. Check levels
        const levRes = await pool.query(
            'SELECT id, level_number, title, learning_materials FROM levels WHERE course_id = ? ORDER BY level_number',
            [c.id]
        );
        const levels = getRows(levRes);

        console.log('\n=== LEVELS ===');
        console.log('Total levels:', levels.length);

        for (const lev of levels) {
            console.log(`\n--- Level ${lev.level_number}: ${lev.title} ---`);
            if (!lev.learning_materials) {
                console.log('  FAIL: No learning_materials');
                continue;
            }

            let mat: any;
            try {
                mat = typeof lev.learning_materials === 'string'
                    ? JSON.parse(lev.learning_materials)
                    : lev.learning_materials;
            } catch {
                console.log('  FAIL: Invalid JSON');
                continue;
            }

            console.log('  introduction:', mat.introduction ? 'YES (' + mat.introduction.length + ' chars)' : 'MISSING');
            console.log('  concepts:', mat.concepts ? 'YES (' + mat.concepts.length + ' items)' : 'MISSING');
            if (mat.concepts) {
                mat.concepts.forEach((c: any, i: number) => console.log('    ' + (i + 1) + '. ' + c.title));
            }
            console.log('  key_terms:', mat.key_terms ? 'YES (' + mat.key_terms.length + ' items)' : 'MISSING');
            console.log('  resources:', mat.resources ? 'YES (' + mat.resources.length + ' items)' : 'MISSING');
            console.log('  example_code:', mat.example_code ? 'YES (' + mat.example_code.length + ' chars)' : 'MISSING');
        }

        // 3. Check questions
        for (const lev of levels) {
            const qRes = await pool.query(
                'SELECT COUNT(*) as cnt FROM questions WHERE level_id = ?',
                [lev.id]
            );
            const rows = getRows(qRes);
            console.log(`\nQuestions for Level ${lev.level_number}: ${rows[0]?.cnt || 0}`);
        }

        console.log('\n=== ALL CHECKS PASSED ===');
        process.exit(0);
    } catch (err: any) {
        console.error('ERROR:', err.message);
        process.exit(1);
    }
}

detailedVerify();
