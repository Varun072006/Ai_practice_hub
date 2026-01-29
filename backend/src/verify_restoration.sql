SELECT COUNT(*) as user_count FROM users;
SELECT username, role, email FROM users;
SELECT COUNT(*) as levels_with_content FROM levels WHERE learning_materials IS NOT NULL;
SELECT title, LENGTH(learning_materials) as content_length FROM levels LIMIT 5;
