const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const fs = require('fs');
async function inspectQuestion() {
    console.log('Using DATABASE_URL:', process.env.DATABASE_URL);
    const pool = mysql.createPool({
        uri: process.env.DATABASE_URL,
        ssl: {
            minVersion: 'TLSv1.2',
            ca: fs.readFileSync(path.join(__dirname, 'tidb-ca.pem'))
        }
    });
    try {
        const [targetQuestions] = await pool.query("SELECT level_id FROM questions WHERE title LIKE '%travel destination%'");
        if (targetQuestions.length === 0) {
            console.log('No travel destination question found');
            return;
        }
        const levelId = targetQuestions[0].level_id;
        console.log('Found level_id:', levelId);

        const query = "SELECT id, title, reference_solution, output_format, question_type FROM questions WHERE level_id = ? ORDER BY id";
        console.log('Running query:', query, 'with levelId:', levelId);
        const [questions] = await pool.query(query, [levelId]);

        console.log('Found', questions.length, 'questions in this level');

        for (const q of questions) {
            console.log('---');
            console.log('ID:', q.id);
            console.log('Title:', q.title);
            console.log('Type:', q.question_type);
            console.log('Output Format (Assets):', q.output_format);
            console.log('Reference Solution:', q.reference_solution);

            if (q.reference_solution) {
                try {
                    const parsed = JSON.parse(q.reference_solution);
                    console.log('Parsed Reference Solution:', parsed);
                    if (!parsed.html && !parsed.css && !parsed.js) {
                        console.log('WARNING: Parsed solution is empty!');
                    }
                } catch (e) {
                    console.log('Reference solution is NOT JSON');
                }
            } else {
                console.log('WARNING: Reference solution is NULL/Empty');
            }
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

inspectQuestion();
