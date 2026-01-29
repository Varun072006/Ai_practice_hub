-- AI Practice Hub Database Schema (MySQL)

-- Reset tables for clean initialization (Order matters due to FKs)
-- Clean up new tables first (dependents)
DROP TABLE IF EXISTS faculty_alerts;
DROP TABLE IF EXISTS learning_metrics;
DROP TABLE IF EXISTS diagnostic_skill_scores;
DROP TABLE IF EXISTS diagnostic_responses;
DROP TABLE IF EXISTS diagnostic_sessions;
DROP TABLE IF EXISTS skill_practice_attempts;
DROP TABLE IF EXISTS skill_mastery_history;
DROP TABLE IF EXISTS user_skill_mastery;
DROP TABLE IF EXISTS level_skills;
DROP TABLE IF EXISTS skill_prerequisites;
DROP TABLE IF EXISTS skills;

-- Clean up existing tables
DROP TABLE IF EXISTS test_case_results;
DROP TABLE IF EXISTS user_submissions;
DROP TABLE IF EXISTS session_questions;
DROP TABLE IF EXISTS practice_sessions;
DROP TABLE IF EXISTS user_progress;
DROP TABLE IF EXISTS user_statistics;
DROP TABLE IF EXISTS test_cases;
DROP TABLE IF EXISTS mcq_options;
DROP TABLE IF EXISTS questions;
DROP TABLE IF EXISTS levels;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS users;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id CHAR(36) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'student',
    name VARCHAR(100),
    roll_number VARCHAR(50) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CHECK (role IN ('student', 'admin'))
);

-- Courses table
CREATE TABLE IF NOT EXISTS courses (
    id CHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    total_levels INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Levels table
CREATE TABLE IF NOT EXISTS levels (
    id CHAR(36) PRIMARY KEY,
    course_id CHAR(36) NOT NULL,
    level_number INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    time_limit INTEGER,
    topic_description TEXT,
    learning_materials JSON,
    code_snippet TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_course_level (course_id, level_number),
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- Questions table
CREATE TABLE IF NOT EXISTS questions (
    id CHAR(36) PRIMARY KEY,
    level_id CHAR(36) NOT NULL,
    question_type VARCHAR(20) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    difficulty VARCHAR(20) DEFAULT 'medium',
    points INT DEFAULT 10,
    time_limit INT DEFAULT 30,
    memory_limit INT DEFAULT 256,
    input_format TEXT,
    output_format TEXT,
    constraints TEXT,
    reference_solution TEXT,
    explanation TEXT,
    concepts JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CHECK (question_type IN ('coding', 'mcq')),
    CHECK (difficulty IN ('easy', 'medium', 'hard')),
    FOREIGN KEY (level_id) REFERENCES levels(id) ON DELETE CASCADE
);

-- MCQ Options table
CREATE TABLE IF NOT EXISTS mcq_options (
    id CHAR(36) PRIMARY KEY,
    question_id CHAR(36) NOT NULL,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT FALSE,
    option_letter VARCHAR(1) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

-- Test Cases table
CREATE TABLE IF NOT EXISTS test_cases (
    id CHAR(36) PRIMARY KEY,
    question_id CHAR(36) NOT NULL,
    input_data TEXT NOT NULL,
    expected_output TEXT NOT NULL,
    is_hidden BOOLEAN DEFAULT FALSE,
    test_case_number INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

-- Practice Sessions table
CREATE TABLE IF NOT EXISTS practice_sessions (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    course_id CHAR(36) NOT NULL,
    level_id CHAR(36) NOT NULL,
    session_type VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'in_progress',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    time_limit INTEGER,
    total_questions INTEGER DEFAULT 0,
    questions_answered INTEGER DEFAULT 0,
    CHECK (session_type IN ('coding', 'mcq')),
    CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (level_id) REFERENCES levels(id) ON DELETE CASCADE
);

-- Session Questions (many-to-many relationship)
CREATE TABLE IF NOT EXISTS session_questions (
    id CHAR(36) PRIMARY KEY,
    session_id CHAR(36) NOT NULL,
    question_id CHAR(36) NOT NULL,
    question_order INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'not_attempted',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (status IN ('not_attempted', 'attempted', 'completed')),
    FOREIGN KEY (session_id) REFERENCES practice_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

-- User Submissions table
CREATE TABLE IF NOT EXISTS user_submissions (
    id CHAR(36) PRIMARY KEY,
    session_id CHAR(36) NOT NULL,
    question_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    submission_type VARCHAR(20) NOT NULL,
    submitted_code TEXT,
    selected_option_id CHAR(36),
    language VARCHAR(20),
    test_cases_passed INTEGER DEFAULT 0,
    total_test_cases INTEGER DEFAULT 0,
    is_correct BOOLEAN DEFAULT FALSE,
    execution_time INTEGER,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (submission_type IN ('coding', 'mcq')),
    FOREIGN KEY (session_id) REFERENCES practice_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (selected_option_id) REFERENCES mcq_options(id)
);

-- Test Case Results table
CREATE TABLE IF NOT EXISTS test_case_results (
    id CHAR(36) PRIMARY KEY,
    submission_id CHAR(36) NOT NULL,
    test_case_id CHAR(36) NOT NULL,
    passed BOOLEAN DEFAULT FALSE,
    actual_output TEXT,
    error_message TEXT,
    execution_time INTEGER,
    FOREIGN KEY (submission_id) REFERENCES user_submissions(id) ON DELETE CASCADE,
    FOREIGN KEY (test_case_id) REFERENCES test_cases(id) ON DELETE CASCADE
);

-- User Progress table
CREATE TABLE IF NOT EXISTS user_progress (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    course_id CHAR(36) NOT NULL,
    level_id CHAR(36) NOT NULL,
    status VARCHAR(20) DEFAULT 'locked',
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CHECK (status IN ('locked', 'unlocked', 'in_progress', 'completed')),
    UNIQUE KEY unique_user_level (user_id, level_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (level_id) REFERENCES levels(id) ON DELETE CASCADE
);

-- User Statistics table
CREATE TABLE IF NOT EXISTS user_statistics (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL UNIQUE,
    total_problems_attempted INTEGER DEFAULT 0,
    total_problems_solved INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 0.00,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_practice_date DATE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Skills table
CREATE TABLE IF NOT EXISTS skills (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    difficulty_tier VARCHAR(20) DEFAULT 'beginner',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CHECK (difficulty_tier IN ('beginner', 'intermediate', 'advanced'))
);

-- Skill Prerequisites table
CREATE TABLE IF NOT EXISTS skill_prerequisites (
    id CHAR(36) PRIMARY KEY,
    skill_id CHAR(36) NOT NULL,
    prerequisite_skill_id CHAR(36) NOT NULL,
    relationship_type VARCHAR(20) DEFAULT 'required',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (relationship_type IN ('required', 'recommended', 'optional')),
    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
    FOREIGN KEY (prerequisite_skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

-- Level Skills (Mapping levels to skills)
CREATE TABLE IF NOT EXISTS level_skills (
    id CHAR(36) PRIMARY KEY,
    level_id CHAR(36) NOT NULL,
    skill_id CHAR(36) NOT NULL,
    contribution_type VARCHAR(20) DEFAULT 'teaches',
    weight DECIMAL(4,2) DEFAULT 5.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (contribution_type IN ('teaches', 'practices', 'assesses')),
    FOREIGN KEY (level_id) REFERENCES levels(id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

-- User Skill Mastery table
CREATE TABLE IF NOT EXISTS user_skill_mastery (
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
);

-- Skill Mastery History table
CREATE TABLE IF NOT EXISTS skill_mastery_history (
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
);

-- Skill Practice Attempts table
CREATE TABLE IF NOT EXISTS skill_practice_attempts (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    skill_id CHAR(36) NOT NULL,
    question_id CHAR(36) NOT NULL,
    attempt_type VARCHAR(20) NOT NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    is_correct BOOLEAN DEFAULT FALSE,
    score DECIMAL(5,2) DEFAULT 0.00,
    answer_submitted TEXT,
    language VARCHAR(50),
    test_cases_passed INTEGER,
    total_test_cases INTEGER,
    time_taken_seconds INTEGER,
    execution_time_ms INTEGER,
    explanation TEXT,
    mastery_delta DECIMAL(5,2),
    mastery_before DECIMAL(5,2),
    mastery_after DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (attempt_type IN ('mcq', 'coding')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

-- Diagnostic Sessions
CREATE TABLE IF NOT EXISTS diagnostic_sessions (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    status VARCHAR(20) DEFAULT 'in_progress', -- in_progress, completed, abandoned
    total_questions INTEGER DEFAULT 0,
    skills_tested INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,
    average_score DECIMAL(5,2),
    recommended_path VARCHAR(50), -- remedial, standard, accelerated
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Diagnostic Responses
CREATE TABLE IF NOT EXISTS diagnostic_responses (
    id CHAR(36) PRIMARY KEY,
    session_id CHAR(36) NOT NULL,
    question_id CHAR(36) NOT NULL,
    skill_id CHAR(36) NOT NULL,
    question_type VARCHAR(20) NOT NULL,
    answer_submitted TEXT,
    is_correct BOOLEAN DEFAULT FALSE,
    time_taken_seconds INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES diagnostic_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

-- Diagnostic Skill Scores
CREATE TABLE IF NOT EXISTS diagnostic_skill_scores (
    id CHAR(36) PRIMARY KEY,
    session_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    skill_id CHAR(36) NOT NULL,
    questions_asked INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,
    score DECIMAL(5,2) DEFAULT 0.00,
    recommended_path VARCHAR(50),
    applied_to_mastery BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES diagnostic_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

-- Learning Metrics
CREATE TABLE IF NOT EXISTS learning_metrics (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    skill_id CHAR(36) NOT NULL,
    avg_time_per_attempt DECIMAL(10,2),
    attempt_frequency DECIMAL(5,2),
    success_rate DECIMAL(5,2),
    recent_success_rate DECIMAL(5,2),
    improvement_velocity DECIMAL(5,2),
    engagement_score INTEGER,
    consistency_score INTEGER,
    predicted_mastery_7d DECIMAL(5,2),
    predicted_mastery_14d DECIMAL(5,2),
    predicted_mastery_30d DECIMAL(5,2),
    estimated_mastery_date TIMESTAMP NULL,
    is_at_risk BOOLEAN DEFAULT FALSE,
    risk_factors JSON,
    computed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_skill_metrics (user_id, skill_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

-- Faculty Alerts
CREATE TABLE IF NOT EXISTS faculty_alerts (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    skill_id CHAR(36),
    course_id CHAR(36),
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) DEFAULT 'medium',
    title VARCHAR(255) NOT NULL,
    description TEXT,
    recommended_action TEXT,
    status VARCHAR(20) DEFAULT 'new',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE SET NULL,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL
);

-- Insert default courses
INSERT INTO courses (id, title, description, total_levels) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 'Python', 'Master Python from basics to AI implementation', 5),
    ('550e8400-e29b-41d4-a716-446655440002', 'C Programming', 'Deep dive into memory management, pointers, and low-level optimization', 6),
    ('550e8400-e29b-41d4-a716-446655440003', 'Machine Learning', 'Introduction to neural networks, algorithms, and predictive modeling', 10)
ON DUPLICATE KEY UPDATE id=id;

-- Insert default levels for Python with learning materials
INSERT INTO levels (id, course_id, level_number, title, description, learning_materials, code_snippet) VALUES
    ('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 1, 'Introduction to Python', 'Basic syntax, variables, and data types',
     '{"introduction": "Welcome to Python! Learn the fundamentals of this powerful programming language.", "concepts": [{"title": "Variables", "explanation": "Store and manipulate data."}, {"title": "Data Types", "explanation": "Understand integers, strings, floats, and booleans."}], "key_terms": ["Variable", "String", "Integer", "Float"], "resources": [{"title": "Python Introduction", "url": "https://www.w3schools.com/python/python_intro.asp"}, {"title": "Python Syntax", "url": "https://www.w3schools.com/python/python_syntax.asp"}, {"title": "Python Variables", "url": "https://www.w3schools.com/python/python_variables.asp"}, {"title": "GeeksForGeeks: Python Basics", "url": "https://www.geeksforgeeks.org/python-programming-language/"}]}',
     '# Example Code\nprint("Hello, Python!")'),
    ('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 2, 'Conditionals', 'If, Elif, Else statements',
     '{"introduction": "Make decisions in your Python programs with conditionals.", "concepts": [{"title": "If Statement", "explanation": "Execute code based on conditions."}, {"title": "Elif and Else", "explanation": "Handle multiple conditions."}], "key_terms": ["If", "Elif", "Else", "Boolean"], "resources": [{"title": "Python If...Else", "url": "https://www.w3schools.com/python/python_conditions.asp"}, {"title": "GeeksForGeeks: Python Conditionals", "url": "https://www.geeksforgeeks.org/conditional-statements-in-python/"}]}',
     'x = 10\nif x > 5:\n    print("x is greater than 5")\nelse:\n    print("x is 5 or less")'),
    ('660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', 3, 'Loops', 'For and While loops',
     '{"introduction": "Repeat actions efficiently using loops.", "concepts": [{"title": "For Loop", "explanation": "Iterate over sequences."}, {"title": "While Loop", "explanation": "Repeat while a condition is true."}], "key_terms": ["For", "While", "Range", "Break", "Continue"], "resources": [{"title": "Python For Loops", "url": "https://www.w3schools.com/python/python_for_loops.asp"}, {"title": "Python While Loops", "url": "https://www.w3schools.com/python/python_while_loops.asp"}, {"title": "GeeksForGeeks: Python Loops", "url": "https://www.geeksforgeeks.org/loops-in-python/"}]}',
     'for i in range(5):\n    print(i)'),
    ('660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440001', 4, 'Lists & Arrays', 'Working with lists and collections',
     '{"introduction": "Store and manipulate collections of data.", "concepts": [{"title": "List Creation", "explanation": "Create and modify lists."}, {"title": "List Methods", "explanation": "Use append, remove, sort, and more."}], "key_terms": ["List", "Append", "Index", "Slice"], "resources": [{"title": "Python Lists", "url": "https://www.w3schools.com/python/python_lists.asp"}, {"title": "Python List Methods", "url": "https://www.w3schools.com/python/python_lists_methods.asp"}, {"title": "GeeksForGeeks: Python Lists", "url": "https://www.geeksforgeeks.org/python-lists/"}]}',
     'fruits = ["apple", "banana", "cherry"]\nfruits.append("orange")\nprint(fruits)'),
    ('660e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440001', 5, 'Functions', 'Defining and calling functions',
     '{"introduction": "Create reusable code blocks with functions.", "concepts": [{"title": "Function Definition", "explanation": "Create your own functions with def."}, {"title": "Parameters", "explanation": "Pass data into functions."}], "key_terms": ["def", "return", "parameter", "argument"], "resources": [{"title": "Python Functions", "url": "https://www.w3schools.com/python/python_functions.asp"}, {"title": "GeeksForGeeks: Python Functions", "url": "https://www.geeksforgeeks.org/python-functions/"}]}',
     'def greet(name):\n    return f"Hello, {name}!"\n\nprint(greet("World"))')
ON DUPLICATE KEY UPDATE 
    title=VALUES(title), 
    description=VALUES(description), 
    learning_materials=VALUES(learning_materials),
    code_snippet=VALUES(code_snippet);

-- Insert default levels for C with learning materials
INSERT INTO levels (id, course_id, level_number, title, description, learning_materials, code_snippet) VALUES
    ('660e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440002', 1, 'Introduction to C', 'Basic syntax, variables, and data types', 
     '{"introduction": "Welcome to Introduction to C! In this lesson, we will dive into the core concepts of C Programming.", "concepts": [{"title": "Core Concept 1", "explanation": "This is a fundamental building block."}, {"title": "Core Concept 2", "explanation": "Understanding this is crucial for advanced topics."}], "key_terms": ["Syntax", "Logic", "Compilation"], "resources": [{"title": "C Introduction", "url": "https://www.w3schools.com/c/c_intro.php"}, {"title": "C Syntax", "url": "https://www.w3schools.com/c/c_syntax.php"}, {"title": "C Output", "url": "https://www.w3schools.com/c/c_output.php"}, {"title": "C Comments", "url": "https://www.w3schools.com/c/c_comments.php"}, {"title": "GeeksForGeeks: C Language", "url": "https://www.geeksforgeeks.org/c-programming-language/"}]}',
     '// Example Code\nprint(\"Hello Learning Phase!\");'),
    ('660e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440002', 2, 'Conditionals', 'If, Else If, Else, and Switch statements',
     '{"introduction": "Learn decision-making in C with conditional statements.", "concepts": [{"title": "If-Else Statements", "explanation": "Execute code based on conditions."}, {"title": "Switch Statement", "explanation": "Handle multiple conditions efficiently."}], "key_terms": ["If", "Else", "Switch", "Case"], "resources": [{"title": "C If...Else", "url": "https://www.w3schools.com/c/c_conditions.php"}, {"title": "C Switch", "url": "https://www.w3schools.com/c/c_switch.php"}, {"title": "Using Ternary Operator", "url": "https://www.w3schools.com/c/c_ternary.php"}, {"title": "GeeksForGeeks: Decision Making", "url": "https://www.geeksforgeeks.org/decision-making-c-cpp/"}]}',
     '#include <stdio.h>\nint main() {\n    int x = 10;\n    if (x > 5) {\n        printf("x is greater than 5");\n    }\n    return 0;\n}'),
    ('660e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440002', 3, 'Loops', 'While, Do-While, and For loops',
     '{"introduction": "Master iteration using loops in C programming.", "concepts": [{"title": "For Loop", "explanation": "Repeat code a specific number of times."}, {"title": "While Loop", "explanation": "Repeat code while a condition is true."}], "key_terms": ["For", "While", "Do-While", "Break", "Continue"], "resources": [{"title": "C While Loop", "url": "https://www.w3schools.com/c/c_while_loop.php"}, {"title": "C For Loop", "url": "https://www.w3schools.com/c/c_for_loop.php"}, {"title": "C Break and Continue", "url": "https://www.w3schools.com/c/c_break.php"}, {"title": "GeeksForGeeks: Loops in C", "url": "https://www.geeksforgeeks.org/loops-in-c-and-cpp/"}]}',
     '#include <stdio.h>\nint main() {\n    for (int i = 0; i < 5; i++) {\n        printf("%d\\n", i);\n    }\n    return 0;\n}'),
    ('660e8400-e29b-41d4-a716-446655440014', '550e8400-e29b-41d4-a716-446655440002', 4, 'Arrays', 'Single and multi-dimensional arrays',
     '{"introduction": "Learn to store multiple values using arrays.", "concepts": [{"title": "Array Declaration", "explanation": "Create and initialize arrays."}, {"title": "Array Indexing", "explanation": "Access elements using indices."}], "key_terms": ["Array", "Index", "Element", "Size"], "resources": [{"title": "C Arrays", "url": "https://www.w3schools.com/c/c_arrays.php"}, {"title": "C Multi-Dimensional Arrays", "url": "https://www.w3schools.com/c/c_arrays_multi.php"}, {"title": "GeeksForGeeks: Arrays in C", "url": "https://www.geeksforgeeks.org/arrays-in-c-cpp/"}]}',
     '#include <stdio.h>\nint main() {\n    int arr[5] = {1, 2, 3, 4, 5};\n    printf("%d", arr[0]);\n    return 0;\n}'),
    ('660e8400-e29b-41d4-a716-446655440015', '550e8400-e29b-41d4-a716-446655440002', 5, 'Strings', 'Character arrays and string functions',
     '{"introduction": "Work with text data using strings in C.", "concepts": [{"title": "String Declaration", "explanation": "Create strings as character arrays."}, {"title": "String Functions", "explanation": "Use strlen, strcpy, strcat, and more."}], "key_terms": ["String", "Character", "strlen", "strcpy"], "resources": [{"title": "C Strings", "url": "https://www.w3schools.com/c/c_strings.php"}, {"title": "C String Functions", "url": "https://www.w3schools.com/c/c_strings_functions.php"}, {"title": "GeeksForGeeks: Strings in C", "url": "https://www.geeksforgeeks.org/strings-in-c/"}]}',
     '#include <stdio.h>\n#include <string.h>\nint main() {\n    char str[] = "Hello";\n    printf("%lu", strlen(str));\n    return 0;\n}'),
    ('660e8400-e29b-41d4-a716-446655440016', '550e8400-e29b-41d4-a716-446655440002', 6, 'Functions', 'Function declaration, definition, and recursion',
     '{"introduction": "Create reusable code blocks with functions.", "concepts": [{"title": "Function Definition", "explanation": "Create your own functions."}, {"title": "Recursion", "explanation": "Functions that call themselves."}], "key_terms": ["Function", "Return", "Parameters", "Recursion"], "resources": [{"title": "C Functions", "url": "https://www.w3schools.com/c/c_functions.php"}, {"title": "C Function Parameters", "url": "https://www.w3schools.com/c/c_function_parameters.php"}, {"title": "GeeksForGeeks: Functions in C", "url": "https://www.geeksforgeeks.org/functions-in-c/"}]}',
     '#include <stdio.h>\nint add(int a, int b) {\n    return a + b;\n}\nint main() {\n    printf("%d", add(5, 3));\n    return 0;\n}')
ON DUPLICATE KEY UPDATE 
    title=VALUES(title), 
    description=VALUES(description), 
    learning_materials=VALUES(learning_materials),
    code_snippet=VALUES(code_snippet);

-- Insert default levels for Machine Learning
INSERT INTO levels (id, course_id, level_number, title, description) VALUES
    ('660e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440003', 1, 'Introduction to Supervised Learning', 'Foundational concepts of supervised learning algorithms'),
    ('660e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440003', 2, 'Linear Regression', 'Understanding linear relationships and predictions'),
    ('660e8400-e29b-41d4-a716-446655440023', '550e8400-e29b-41d4-a716-446655440003', 3, 'Logistic Regression & Classification', 'Binary and multiclass classification techniques'),
    ('660e8400-e29b-41d4-a716-446655440024', '550e8400-e29b-41d4-a716-446655440003', 4, 'Decision Trees & Random Forests', 'Tree-based methods and ensemble learning'),
    ('660e8400-e29b-41d4-a716-446655440025', '550e8400-e29b-41d4-a716-446655440003', 5, 'Support Vector Machines (SVM)', 'Hyperplanes and kernel tricks'),
    ('660e8400-e29b-41d4-a716-446655440026', '550e8400-e29b-41d4-a716-446655440003', 6, 'Unsupervised Learning: Clustering', 'K-Means, Hierarchical clustering'),
    ('660e8400-e29b-41d4-a716-446655440027', '550e8400-e29b-41d4-a716-446655440003', 7, 'Neural Networks Basics', 'Introduction to neural networks'),
    ('660e8400-e29b-41d4-a716-446655440028', '550e8400-e29b-41d4-a716-446655440003', 8, 'Deep Learning', 'Deep neural networks and architectures'),
    ('660e8400-e29b-41d4-a716-446655440029', '550e8400-e29b-41d4-a716-446655440003', 9, 'Natural Language Processing', 'NLP concepts and applications'),
    ('660e8400-e29b-41d4-a716-446655440030', '550e8400-e29b-41d4-a716-446655440003', 10, 'Computer Vision', 'Image processing and recognition')
ON DUPLICATE KEY UPDATE id=id;

-- Create indexes for better performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_questions_level_id ON questions(level_id);
CREATE INDEX idx_test_cases_question_id ON test_cases(question_id);
CREATE INDEX idx_practice_sessions_user_id ON practice_sessions(user_id);
CREATE INDEX idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX idx_user_progress_course_id ON user_progress(course_id);
CREATE INDEX idx_user_submissions_session_id ON user_submissions(session_id);


-- Insert default questions for C Level 1 (Pointers & Memory)
INSERT INTO questions (id, level_id, question_type, title, description, difficulty, explanation, concepts) VALUES
    ('770e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440011', 'mcq', 'Pointer Size', 'What is the size of a pointer variable on a standard 64-bit architecture?', 'easy', 'On a 64-bit architecture, memory addresses are 64-bits long, which equals 8 bytes.', '["pointers", "architecture", "memory"]'),
    ('770e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440011', 'mcq', 'Dereference Operator', 'Which operator is used to access the value stored at the address a pointer points to?', 'easy', 'The asterisk (*) is the dereference operator used to access the value at the pointer''s address.', '["pointers", "operators"]'),
    ('770e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440011', 'mcq', 'Null Pointer', 'Which value is guaranteed to assign a pointer to nowhere?', 'easy', 'NULL (or 0) is used to indicate that a pointer does not point to any valid memory location.', '["pointers", "null"]'),
    ('770e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440011', 'mcq', 'MALLOC Return Type', 'What does malloc() return?', 'medium', 'malloc returns a void pointer (void*), which can be cast to any pointer type.', '["memory management", "malloc"]'),
    ('770e8400-e29b-41d4-a716-446655440005', '660e8400-e29b-41d4-a716-446655440011', 'mcq', 'Freed Memory', 'What happens if you access memory after freeing it?', 'medium', 'Accessing freed memory is undefined behavior and can cause crashes or corruption (Dangling Pointer).', '["memory management", "undefined behavior"]'),
    ('770e8400-e29b-41d4-a716-446655440006', '660e8400-e29b-41d4-a716-446655440011', 'mcq', 'Pointer Arithmetic', 'If int *p points to address 1000 and sizeof(int) is 4, what is p+1?', 'medium', 'Pointer arithmetic adds sizeof(type) to the address. 1000 + 4 = 1004.', '["pointers", "arithmetic"]'),
    ('770e8400-e29b-41d4-a716-446655440007', '660e8400-e29b-41d4-a716-446655440011', 'mcq', 'Array Name', 'An array name often decays into a pointer to its:', 'easy', 'The array name decays to a pointer to its first element (index 0).', '["arrays", "pointers"]'),
    ('770e8400-e29b-41d4-a716-446655440008', '660e8400-e29b-41d4-a716-446655440011', 'mcq', 'Void Pointer', 'What is a void pointer?', 'medium', 'A void pointer is a generic pointer that can point to objects of any data type.', '["pointers", "void"]'),
    ('770e8400-e29b-41d4-a716-446655440009', '660e8400-e29b-41d4-a716-446655440011', 'mcq', 'Pointer to Pointer', 'How do you declare a pointer to an integer pointer?', 'medium', 'int **p declares a pointer to a pointer to an integer.', '["pointers", "complex types"]'),
    ('770e8400-e29b-41d4-a716-446655440010', '660e8400-e29b-41d4-a716-446655440011', 'mcq', 'Calloc vs Malloc', 'What is the key difference between calloc and malloc?', 'easy', 'calloc initializes the allocated memory to zero, whereas malloc leaves it uninitialized.', '["memory management", "calloc"]')
ON DUPLICATE KEY UPDATE id=id;

-- Options for new C MCQs
INSERT INTO mcq_options (id, question_id, option_text, is_correct, option_letter) VALUES
    -- Q3
    (UUID(), '770e8400-e29b-41d4-a716-446655440003', '0 or NULL', TRUE, 'A'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440003', '-1', FALSE, 'B'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440003', '1', FALSE, 'C'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440003', 'undefined', FALSE, 'D'),
    -- Q4
    (UUID(), '770e8400-e29b-41d4-a716-446655440004', 'int*', FALSE, 'A'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440004', 'void*', TRUE, 'B'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440004', 'char*', FALSE, 'C'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440004', 'null', FALSE, 'D'),
    -- Q5
    (UUID(), '770e8400-e29b-41d4-a716-446655440005', 'Compile error', FALSE, 'A'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440005', 'Undefined behavior', TRUE, 'B'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440005', 'Returns 0', FALSE, 'C'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440005', 'Nothing happens', FALSE, 'D'),
    -- Q6
    (UUID(), '770e8400-e29b-41d4-a716-446655440006', '1001', FALSE, 'A'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440006', '1004', TRUE, 'B'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440006', '1000', FALSE, 'C'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440006', 'Unknown', FALSE, 'D'),
    -- Q7
    (UUID(), '770e8400-e29b-41d4-a716-446655440007', 'First element', TRUE, 'A'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440007', 'Last element', FALSE, 'B'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440007', 'Size of array', FALSE, 'C'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440007', 'Middle element', FALSE, 'D'),
    -- Q8
    (UUID(), '770e8400-e29b-41d4-a716-446655440008', 'Pointer to void function', FALSE, 'A'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440008', 'Generic pointer type', TRUE, 'B'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440008', 'Null pointer', FALSE, 'C'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440008', 'Invalid pointer', FALSE, 'D'),
    -- Q9
    (UUID(), '770e8400-e29b-41d4-a716-446655440009', 'int &p', FALSE, 'A'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440009', 'int **p', TRUE, 'B'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440009', 'int *p', FALSE, 'C'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440009', 'int p**', FALSE, 'D'),
    -- Q10
    (UUID(), '770e8400-e29b-41d4-a716-446655440010', 'calloc initializes memory to zero', TRUE, 'A'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440010', 'malloc initializes memory to zero', FALSE, 'B'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440010', 'calloc is faster', FALSE, 'C'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440010', 'No difference', FALSE, 'D')
ON DUPLICATE KEY UPDATE id=id;

-- C Level 1 Coding Problems
INSERT INTO questions (id, level_id, question_type, title, description, difficulty, reference_solution, explanation, concepts) VALUES
    ('770e8400-e29b-41d4-a716-446655440011', '660e8400-e29b-41d4-a716-446655440011', 'coding', 'Swap Two Numbers', 'Write a function void swap(int *a, int *b) that swaps values of two integers using pointers.', 'medium', 'void swap(int *a, int *b) { int temp = *a; *a = *b; *b = temp; }', 'To swap two numbers using pointers, you dereference the pointers to get values, store one in a temp var, and then switch them.', '["pointers", "functions"]'),
    ('770e8400-e29b-41d4-a716-446655440012', '660e8400-e29b-41d4-a716-446655440011', 'coding', 'Calculate Array Sum', 'Write a function int sumArray(int *arr, int size) that returns the sum of elements using pointer arithmetic.', 'hard', 'int sumArray(int *arr, int size) { int sum = 0; for(int i=0; i<size; i++) { sum += *(arr + i); } return sum; }', 'Pointer arithmetic allows traversing arrays. *(arr + i) is equivalent to arr[i].', '["pointers", "arrays", "arithmetic"]')
ON DUPLICATE KEY UPDATE id=id;

-- Test Cases for C Coding Problems
INSERT INTO test_cases (id, question_id, input_data, expected_output, is_hidden, test_case_number) VALUES
    -- Swap (Q11): We test this via a driver code in reality, but for simplicity here we assume inputs
    (UUID(), '770e8400-e29b-41d4-a716-446655440011', '10 20', '20 10', FALSE, 1),
    (UUID(), '770e8400-e29b-41d4-a716-446655440011', '5 5', '5 5', FALSE, 2),
    (UUID(), '770e8400-e29b-41d4-a716-446655440011', '-1 1', '1 -1', TRUE, 3),
    (UUID(), '770e8400-e29b-41d4-a716-446655440011', '0 100', '100 0', TRUE, 4),
    (UUID(), '770e8400-e29b-41d4-a716-446655440011', '99 1', '1 99', TRUE, 5),
    (UUID(), '770e8400-e29b-41d4-a716-446655440011', '123 456', '456 123', TRUE, 6),
    -- Sum Array (Q12)
    (UUID(), '770e8400-e29b-41d4-a716-446655440012', '5\n1 2 3 4 5', '15', FALSE, 1),
    (UUID(), '770e8400-e29b-41d4-a716-446655440012', '3\n10 20 30', '60', FALSE, 2),
    (UUID(), '770e8400-e29b-41d4-a716-446655440012', '1\n5', '5', TRUE, 3),
    (UUID(), '770e8400-e29b-41d4-a716-446655440012', '0\n', '0', TRUE, 4),
    (UUID(), '770e8400-e29b-41d4-a716-446655440012', '4\n-1 -2 -3 -4', '-10', TRUE, 5),
    (UUID(), '770e8400-e29b-41d4-a716-446655440012', '3\n100 -100 50', '50', TRUE, 6)
ON DUPLICATE KEY UPDATE id=id;

-- Python Level 1 MCQs (10 Questions)
INSERT INTO questions (id, level_id, question_type, title, description, difficulty, explanation, concepts) VALUES
    ('770e8400-e29b-41d4-a716-446655440020', '660e8400-e29b-41d4-a716-446655440001', 'mcq', 'Python Output', 'What is the output of print(2 ** 3)?', 'easy', 'The ** operator represents exponentiation. 2 ** 3 is 2 * 2 * 2 = 8.', '["operators", "math"]'),
    ('770e8400-e29b-41d4-a716-446655440021', '660e8400-e29b-41d4-a716-446655440001', 'mcq', 'Variable Naming', 'Which of the following is an invalid variable name in Python?', 'easy', 'Variable names cannot start with a number. "2nd_var" is invalid.', '["variables", "syntax"]'),
    ('770e8400-e29b-41d4-a716-446655440022', '660e8400-e29b-41d4-a716-446655440001', 'mcq', 'Data Types', 'What is the type of x = 3.14?', 'easy', 'Numbers with decimal points are of type "float" in Python.', '["data types", "float"]'),
    ('770e8400-e29b-41d4-a716-446655440023', '660e8400-e29b-41d4-a716-446655440001', 'mcq', 'List Indexing', 'Given list L = [1, 2, 3], what is L[-1]?', 'easy', 'Negative indexing calculates position from the end. -1 refers to the last item, which is 3.', '["lists", "indexing"]'),
    ('770e8400-e29b-41d4-a716-446655440024', '660e8400-e29b-41d4-a716-446655440001', 'mcq', 'String Concatenation', 'What is the result of "Hello" + "World"?', 'easy', 'The + operator concatenates strings without adding space. "HelloWorld".', '["strings", "operators"]'),
    ('770e8400-e29b-41d4-a716-446655440025', '660e8400-e29b-41d4-a716-446655440001', 'mcq', 'Boolean Logic', 'What is the result of True and False?', 'easy', 'The AND operator requires both operands to be True. So True and False is False.', '["boolean", "logic"]'),
    ('770e8400-e29b-41d4-a716-446655440026', '660e8400-e29b-41d4-a716-446655440001', 'mcq', 'Type Conversion', 'What does int("10") return?', 'easy', 'int() converts a string or float to an integer. "10" becomes 10.', '["type casting", "int"]'),
    ('770e8400-e29b-41d4-a716-446655440027', '660e8400-e29b-41d4-a716-446655440001', 'mcq', 'Indentation', 'Python uses indentation to define:', 'easy', 'Python uses whitespace indentation to delimit code blocks instead of braces.', '["syntax", "indentation"]'),
    ('770e8400-e29b-41d4-a716-446655440028', '660e8400-e29b-41d4-a716-446655440001', 'mcq', 'Comments', 'Which character is used for single-line comments?', 'easy', 'The hash symbol (#) starts a single-line comment.', '["comments", "syntax"]'),
    ('770e8400-e29b-41d4-a716-446655440029', '660e8400-e29b-41d4-a716-446655440001', 'mcq', 'Input', 'Which function is used to get user input?', 'easy', 'input() reads a line from input, converts it to a string, and returns it.', '["input", "io"]')
ON DUPLICATE KEY UPDATE id=id;

-- Options for Python Level 1
INSERT INTO mcq_options (id, question_id, option_text, is_correct, option_letter) VALUES
    (UUID(), '770e8400-e29b-41d4-a716-446655440020', '6', FALSE, 'A'), (UUID(), '770e8400-e29b-41d4-a716-446655440020', '8', TRUE, 'B'), (UUID(), '770e8400-e29b-41d4-a716-446655440020', '5', FALSE, 'C'), (UUID(), '770e8400-e29b-41d4-a716-446655440020', '9', FALSE, 'D'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440021', 'my_var', FALSE, 'A'), (UUID(), '770e8400-e29b-41d4-a716-446655440021', 'vAR_1', FALSE, 'B'), (UUID(), '770e8400-e29b-41d4-a716-446655440021', '2nd_var', TRUE, 'C'), (UUID(), '770e8400-e29b-41d4-a716-446655440021', '_hidden', FALSE, 'D'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440022', 'int', FALSE, 'A'), (UUID(), '770e8400-e29b-41d4-a716-446655440022', 'float', TRUE, 'B'), (UUID(), '770e8400-e29b-41d4-a716-446655440022', 'double', FALSE, 'C'), (UUID(), '770e8400-e29b-41d4-a716-446655440022', 'decimal', FALSE, 'D'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440023', '3', TRUE, 'A'), (UUID(), '770e8400-e29b-41d4-a716-446655440023', '1', FALSE, 'B'), (UUID(), '770e8400-e29b-41d4-a716-446655440023', '2', FALSE, 'C'), (UUID(), '770e8400-e29b-41d4-a716-446655440023', 'IndexError', FALSE, 'D'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440024', 'HelloWorld', TRUE, 'A'), (UUID(), '770e8400-e29b-41d4-a716-446655440024', 'Hello World', FALSE, 'B'), (UUID(), '770e8400-e29b-41d4-a716-446655440024', 'Error', FALSE, 'C'), (UUID(), '770e8400-e29b-41d4-a716-446655440024', 'NaN', FALSE, 'D'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440025', 'True', FALSE, 'A'), (UUID(), '770e8400-e29b-41d4-a716-446655440025', 'False', TRUE, 'B'), (UUID(), '770e8400-e29b-41d4-a716-446655440025', 'None', FALSE, 'C'), (UUID(), '770e8400-e29b-41d4-a716-446655440025', 'Error', FALSE, 'D'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440026', '"10"', FALSE, 'A'), (UUID(), '770e8400-e29b-41d4-a716-446655440026', '10', TRUE, 'B'), (UUID(), '770e8400-e29b-41d4-a716-446655440026', '10.0', FALSE, 'C'), (UUID(), '770e8400-e29b-41d4-a716-446655440026', 'Error', FALSE, 'D'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440027', 'Code blocks', TRUE, 'A'), (UUID(), '770e8400-e29b-41d4-a716-446655440027', 'Comments', FALSE, 'B'), (UUID(), '770e8400-e29b-41d4-a716-446655440027', 'Variables', FALSE, 'C'), (UUID(), '770e8400-e29b-41d4-a716-446655440027', 'Imports', FALSE, 'D'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440028', '//', FALSE, 'A'), (UUID(), '770e8400-e29b-41d4-a716-446655440028', '#', TRUE, 'B'), (UUID(), '770e8400-e29b-41d4-a716-446655440028', '/*', FALSE, 'C'), (UUID(), '770e8400-e29b-41d4-a716-446655440028', '--', FALSE, 'D'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440029', 'cin', FALSE, 'A'), (UUID(), '770e8400-e29b-41d4-a716-446655440029', 'scanf', FALSE, 'B'), (UUID(), '770e8400-e29b-41d4-a716-446655440029', 'input()', TRUE, 'C'), (UUID(), '770e8400-e29b-41d4-a716-446655440029', 'get()', FALSE, 'D')
ON DUPLICATE KEY UPDATE id=id;

-- Python Level 1 Coding Problems
INSERT INTO questions (id, level_id, question_type, title, description, difficulty, reference_solution, explanation, concepts) VALUES
    ('770e8400-e29b-41d4-a716-446655440030', '660e8400-e29b-41d4-a716-446655440001', 'coding', 'Hello World', 'Write a function hello() that prints "Hello, World!" to the console.', 'easy', 'def hello():\n    print("Hello, World!")', 'The print() function sends data to standard output. String literals are enclosed in quotes.', '["print", "functions", "strings"]'),
    ('770e8400-e29b-41d4-a716-446655440031', '660e8400-e29b-41d4-a716-446655440001', 'coding', 'Area of Circle', 'Write a function circle_area(radius) that returns the area of a circle. Use pi = 3.14159.', 'medium', 'def circle_area(radius):\n    pi = 3.14159\n    return pi * (radius ** 2)', 'Area of a circle is pi * r^2. In Python, power is **.', '["math", "functions", "operators"]')
ON DUPLICATE KEY UPDATE id=id;

-- Test Cases for Python Coding Problems
INSERT INTO test_cases (id, question_id, input_data, expected_output, is_hidden, test_case_number) VALUES
    -- Hello World (Q30)
    (UUID(), '770e8400-e29b-41d4-a716-446655440030', '', 'Hello, World!', FALSE, 1),
    (UUID(), '770e8400-e29b-41d4-a716-446655440030', 'any', 'Hello, World!', FALSE, 2),
    (UUID(), '770e8400-e29b-41d4-a716-446655440030', '123', 'Hello, World!', TRUE, 3),
    (UUID(), '770e8400-e29b-41d4-a716-446655440030', 'test', 'Hello, World!', TRUE, 4),
    (UUID(), '770e8400-e29b-41d4-a716-446655440030', 'hidden', 'Hello, World!', TRUE, 5),
    (UUID(), '770e8400-e29b-41d4-a716-446655440030', 'null', 'Hello, World!', TRUE, 6),
    -- Area of Circle (Q31)
    (UUID(), '770e8400-e29b-41d4-a716-446655440031', '1', '3.14159', FALSE, 1),
    (UUID(), '770e8400-e29b-41d4-a716-446655440031', '2', '12.56636', FALSE, 2),
    (UUID(), '770e8400-e29b-41d4-a716-446655440031', '0', '0.0', TRUE, 3),
    (UUID(), '770e8400-e29b-41d4-a716-446655440031', '10', '314.159', TRUE, 4),
    (UUID(), '770e8400-e29b-41d4-a716-446655440031', '0.5', '0.7853975', TRUE, 5),
    (UUID(), '770e8400-e29b-41d4-a716-446655440031', '100', '31415.9', TRUE, 6)
ON DUPLICATE KEY UPDATE id=id;

-- Machine Learning Level 1 MCQs (10 Questions)
INSERT INTO questions (id, level_id, question_type, title, description, difficulty, explanation, concepts) VALUES
    ('770e8400-e29b-41d4-a716-446655440040', '660e8400-e29b-41d4-a716-446655440021', 'mcq', 'Supervised vs Unsupervised', 'Which of the following is an example of supervised learning?', 'easy', 'Spam detection is supervised because the model is trained on labeled data (spam vs not spam).', '["supervised learning", "classification"]'),
    ('770e8400-e29b-41d4-a716-446655440041', '660e8400-e29b-41d4-a716-446655440021', 'mcq', 'Features', 'In a housing price dataset, "Number of Bedrooms" is likely a:', 'easy', 'Features are the input variables used to make predictions.', '["features", "datasets"]'),
    ('770e8400-e29b-41d4-a716-446655440042', '660e8400-e29b-41d4-a716-446655440021', 'mcq', 'Target Variable', 'What is the "Target" variable?', 'easy', 'The target is the variable the model tries to predict.', '["target", "prediction"]'),
    ('770e8400-e29b-41d4-a716-446655440043', '660e8400-e29b-41d4-a716-446655440021', 'mcq', 'Regression', 'Which problem is a regression problem?', 'easy', 'Regression involves predicting continuous numerical values like price.', '["regression", "prediction"]'),
    ('770e8400-e29b-41d4-a716-446655440044', '660e8400-e29b-41d4-a716-446655440021', 'mcq', 'Classification', 'Which problem is a classification problem?', 'easy', 'Classification involves predicting categorical labels (e.g., Benign vs Malignant).', '["classification", "labels"]'),
    ('770e8400-e29b-41d4-a716-446655440045', '660e8400-e29b-41d4-a716-446655440021', 'mcq', 'Training Set', 'The purpose of the training set is to:', 'easy', 'The training set is used to teach the model patterns in the data.', '["training", "datasets"]'),
    ('770e8400-e29b-41d4-a716-446655440046', '660e8400-e29b-41d4-a716-446655440021', 'mcq', 'Overfitting', 'Overfitting occurs when the model:', 'medium', 'Overfitting happens when a model learns the detailed noise in the training data to the extent that it negatively impacts the performance on new data.', '["overfitting", "noise"]'),
    ('770e8400-e29b-41d4-a716-446655440047', '660e8400-e29b-41d4-a716-446655440021', 'mcq', 'Underfitting', 'Underfitting occurs when the model:', 'medium', 'Underfitting occurs when the model assumes a simple relationship that cannot capture complex trends.', '["underfitting", "bias"]'),
    ('770e8400-e29b-41d4-a716-446655440048', '660e8400-e29b-41d4-a716-446655440021', 'mcq', 'Label', 'In supervised learning, data must be:', 'easy', 'Supervised learning relies on labeled data (input-output pairs).', '["labels", "supervised learning"]'),
    ('770e8400-e29b-41d4-a716-446655440049', '660e8400-e29b-41d4-a716-446655440021', 'mcq', 'Model Evaluation', 'Which metric is commonly used for regression?', 'medium', 'Mean Squared Error (MSE) measures the average squared difference between estimated values and the actual value.', '["evaluation", "metrics", "regression"]')
ON DUPLICATE KEY UPDATE id=id;

-- Options for ML Level 1
INSERT INTO mcq_options (id, question_id, option_text, is_correct, option_letter) VALUES
    (UUID(), '770e8400-e29b-41d4-a716-446655440040', 'Clustering customers', FALSE, 'A'), (UUID(), '770e8400-e29b-41d4-a716-446655440040', 'Spam email detection', TRUE, 'B'), (UUID(), '770e8400-e29b-41d4-a716-446655440040', 'Dimensionality reduction', FALSE, 'C'), (UUID(), '770e8400-e29b-41d4-a716-446655440040', 'Data visualization', FALSE, 'D'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440041', 'Feature', TRUE, 'A'), (UUID(), '770e8400-e29b-41d4-a716-446655440041', 'Target', FALSE, 'B'), (UUID(), '770e8400-e29b-41d4-a716-446655440041', 'Label', FALSE, 'C'), (UUID(), '770e8400-e29b-41d4-a716-446655440041', 'Noise', FALSE, 'D'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440042', 'The variable we want to predict', TRUE, 'A'), (UUID(), '770e8400-e29b-41d4-a716-446655440042', 'The input variables', FALSE, 'B'), (UUID(), '770e8400-e29b-41d4-a716-446655440042', 'The noise in data', FALSE, 'C'), (UUID(), '770e8400-e29b-41d4-a716-446655440042', 'The testing data', FALSE, 'D'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440043', 'Predicting house price', TRUE, 'A'), (UUID(), '770e8400-e29b-41d4-a716-446655440043', 'Predicting cat or dog', FALSE, 'B'), (UUID(), '770e8400-e29b-41d4-a716-446655440043', 'Predicting spam or ham', FALSE, 'C'), (UUID(), '770e8400-e29b-41d4-a716-446655440043', 'Grouping similar items', FALSE, 'D'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440044', 'Predicting temperature', FALSE, 'A'), (UUID(), '770e8400-e29b-41d4-a716-446655440044', 'Predicting tumor benign/malignant', TRUE, 'B'), (UUID(), '770e8400-e29b-41d4-a716-446655440044', 'Predicting stock price', FALSE, 'C'), (UUID(), '770e8400-e29b-41d4-a716-446655440044', 'Predicting height', FALSE, 'D'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440045', 'Teach the model', TRUE, 'A'), (UUID(), '770e8400-e29b-41d4-a716-446655440045', 'Evaluate the model', FALSE, 'B'), (UUID(), '770e8400-e29b-41d4-a716-446655440045', 'Validate the model', FALSE, 'C'), (UUID(), '770e8400-e29b-41d4-a716-446655440045', 'None of the above', FALSE, 'D'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440046', 'Learns noise as signal', TRUE, 'A'), (UUID(), '770e8400-e29b-41d4-a716-446655440046', 'Is too simple', FALSE, 'B'), (UUID(), '770e8400-e29b-41d4-a716-446655440046', 'Performs poorly on training data', FALSE, 'C'), (UUID(), '770e8400-e29b-41d4-a716-446655440046', 'Has high bias', FALSE, 'D'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440047', 'Is too complex', FALSE, 'A'), (UUID(), '770e8400-e29b-41d4-a716-446655440047', 'Cannot capture underlying trend', TRUE, 'B'), (UUID(), '770e8400-e29b-41d4-a716-446655440047', 'Has high variance', FALSE, 'C'), (UUID(), '770e8400-e29b-41d4-a716-446655440047', 'Memorizes training data', FALSE, 'D'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440048', 'Labeled', TRUE, 'A'), (UUID(), '770e8400-e29b-41d4-a716-446655440048', 'Unlabeled', FALSE, 'B'), (UUID(), '770e8400-e29b-41d4-a716-446655440048', 'Cleaned', FALSE, 'C'), (UUID(), '770e8400-e29b-41d4-a716-446655440048', 'Normalized', FALSE, 'D'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440049', 'Accuracy', FALSE, 'A'), (UUID(), '770e8400-e29b-41d4-a716-446655440049', 'Mean Squared Error (MSE)', TRUE, 'B'), (UUID(), '770e8400-e29b-41d4-a716-446655440049', 'F1 Score', FALSE, 'C'), (UUID(), '770e8400-e29b-41d4-a716-446655440049', 'Precision', FALSE, 'D')
ON DUPLICATE KEY UPDATE id=id;

-- ML Level 1 Coding Problems
INSERT INTO questions (id, level_id, question_type, title, description, difficulty, reference_solution, explanation, concepts) VALUES
    ('770e8400-e29b-41d4-a716-446655440050', '660e8400-e29b-41d4-a716-446655440021', 'coding', 'Mean Calculation', 'Write a function mean(values) that calculates the arithmetic mean of a list of numbers.', 'easy', 'def mean(values):\n    if not values: return 0\n    return sum(values) / len(values)', 'The arithmetic mean is the sum of all elements divided by the count of elements.', '["stats", "mean", "lists"]'),
    ('770e8400-e29b-41d4-a716-446655440051', '660e8400-e29b-41d4-a716-446655440021', 'coding', 'Linear Prediction', 'Given slope m, intercept c, and input x, write a function predict(m, c, x) that returns y = mx + c.', 'easy', 'def predict(m, c, x):\n    return m * x + c', 'The equation for a line is y = mx + c. We simply implement this formula.', '["linear algebra", "prediction"]')
ON DUPLICATE KEY UPDATE id=id;

-- Test Cases for ML Coding Problems
INSERT INTO test_cases (id, question_id, input_data, expected_output, is_hidden, test_case_number) VALUES
    -- Mean (Q50)
    (UUID(), '770e8400-e29b-41d4-a716-446655440050', '1,2,3,4,5', '3.0', FALSE, 1),
    (UUID(), '770e8400-e29b-41d4-a716-446655440050', '10,20,30', '20.0', FALSE, 2),
    (UUID(), '770e8400-e29b-41d4-a716-446655440050', '0', '0.0', TRUE, 3),
    (UUID(), '770e8400-e29b-41d4-a716-446655440050', '-1,1', '0.0', TRUE, 4),
    (UUID(), '770e8400-e29b-41d4-a716-446655440050', '100', '100.0', TRUE, 5),
    (UUID(), '770e8400-e29b-41d4-a716-446655440050', '1,1,1,1', '1.0', TRUE, 6),
    -- Predict (Q51) input format: m,c,x
    (UUID(), '770e8400-e29b-41d4-a716-446655440051', '2,1,3', '7', FALSE, 1),
    (UUID(), '770e8400-e29b-41d4-a716-446655440051', '1,0,5', '5', FALSE, 2),
    (UUID(), '770e8400-e29b-41d4-a716-446655440051', '0,5,100', '5', TRUE, 3),
    (UUID(), '770e8400-e29b-41d4-a716-446655440051', '-1,10,5', '5', TRUE, 4),
    (UUID(), '770e8400-e29b-41d4-a716-446655440051', '0.5,0,10', '5.0', TRUE, 5),
    (UUID(), '770e8400-e29b-41d4-a716-446655440051', '10,-5,2', '15', TRUE, 6)
ON DUPLICATE KEY UPDATE id=id;


