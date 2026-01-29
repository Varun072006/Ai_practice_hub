SELECT COUNT(*) as total_questions FROM questions;
SELECT question_type, COUNT(*) FROM questions GROUP BY question_type;
