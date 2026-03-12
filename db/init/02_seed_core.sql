-- ============================================================================
-- AI Practice Hub - Default Admin User + Core Courses Seed Data
-- Auto-runs on first Docker MySQL startup after schema creation
-- ============================================================================

-- ============================================================================
-- DEFAULT ADMIN USER (password: admin123)
-- bcrypt hash of 'admin123'
-- ============================================================================
INSERT INTO users (id, username, email, password_hash, role, name) VALUES
('00000000-0000-0000-0000-000000000001', 'admin', 'admin@practicehub.com',
 '$2a$10$IUJ7wTxgsGIu3JMFPk7Mu.vqgt/pYQNKZFkBONE5l6R.IAIx1.Gdq',
 'admin', 'Administrator')
ON DUPLICATE KEY UPDATE id=id;

-- ============================================================================
-- CORE COURSES
-- ============================================================================
INSERT INTO courses (id, title, description, total_levels) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 'Python', 'Master Python from basics to AI implementation', 5),
    ('550e8400-e29b-41d4-a716-446655440002', 'C Programming', 'Deep dive into memory management, pointers, and low-level optimization', 6),
    ('550e8400-e29b-41d4-a716-446655440003', 'Machine Learning', 'Introduction to neural networks, algorithms, and predictive modeling', 10)
ON DUPLICATE KEY UPDATE title=VALUES(title), description=VALUES(description);

-- ============================================================================
-- PYTHON LEVELS (with learning materials)
-- ============================================================================
INSERT INTO levels (id, course_id, level_number, title, description, learning_materials, code_snippet) VALUES
    ('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 1, 'Introduction to Python', 'Basic syntax, variables, and data types',
     '{"introduction": "Welcome to Python! Learn the fundamentals of this powerful programming language.", "concepts": [{"title": "Variables", "explanation": "Store and manipulate data."}, {"title": "Data Types", "explanation": "Understand integers, strings, floats, and booleans."}], "key_terms": ["Variable", "String", "Integer", "Float"], "resources": [{"title": "Python Introduction", "url": "https://www.w3schools.com/python/python_intro.asp"}]}',
     '# Example Code\nprint("Hello, Python!")'),
    ('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 2, 'Conditionals', 'If, Elif, Else statements',
     '{"introduction": "Make decisions in your Python programs with conditionals.", "concepts": [{"title": "If Statement", "explanation": "Execute code based on conditions."}, {"title": "Elif and Else", "explanation": "Handle multiple conditions."}], "key_terms": ["If", "Elif", "Else", "Boolean"], "resources": [{"title": "Python If...Else", "url": "https://www.w3schools.com/python/python_conditions.asp"}]}',
     'x = 10\nif x > 5:\n    print("x is greater than 5")\nelse:\n    print("x is 5 or less")'),
    ('660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', 3, 'Loops', 'For and While loops',
     '{"introduction": "Repeat actions efficiently using loops.", "concepts": [{"title": "For Loop", "explanation": "Iterate over sequences."}, {"title": "While Loop", "explanation": "Repeat while a condition is true."}], "key_terms": ["For", "While", "Range", "Break", "Continue"], "resources": [{"title": "Python For Loops", "url": "https://www.w3schools.com/python/python_for_loops.asp"}]}',
     'for i in range(5):\n    print(i)'),
    ('660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440001', 4, 'Lists & Arrays', 'Working with lists and collections',
     '{"introduction": "Store and manipulate collections of data.", "concepts": [{"title": "List Creation", "explanation": "Create and modify lists."}, {"title": "List Methods", "explanation": "Use append, remove, sort, and more."}], "key_terms": ["List", "Append", "Index", "Slice"], "resources": [{"title": "Python Lists", "url": "https://www.w3schools.com/python/python_lists.asp"}]}',
     'fruits = ["apple", "banana", "cherry"]\nfruits.append("orange")\nprint(fruits)'),
    ('660e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440001', 5, 'Functions', 'Defining and calling functions',
     '{"introduction": "Create reusable code blocks with functions.", "concepts": [{"title": "Function Definition", "explanation": "Create your own functions with def."}, {"title": "Parameters", "explanation": "Pass data into functions."}], "key_terms": ["def", "return", "parameter", "argument"], "resources": [{"title": "Python Functions", "url": "https://www.w3schools.com/python/python_functions.asp"}]}',
     'def greet(name):\n    return f"Hello, {name}!"\n\nprint(greet("World"))')
ON DUPLICATE KEY UPDATE
    title=VALUES(title),
    description=VALUES(description),
    learning_materials=VALUES(learning_materials),
    code_snippet=VALUES(code_snippet);

-- ============================================================================
-- C PROGRAMMING LEVELS (with learning materials)
-- ============================================================================
INSERT INTO levels (id, course_id, level_number, title, description, learning_materials, code_snippet) VALUES
    ('660e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440002', 1, 'Introduction to C', 'Basic syntax, variables, and data types',
     '{"introduction": "Welcome to C Programming!", "concepts": [{"title": "Core Concept 1", "explanation": "This is a fundamental building block."}, {"title": "Core Concept 2", "explanation": "Understanding this is crucial for advanced topics."}], "key_terms": ["Syntax", "Logic", "Compilation"], "resources": [{"title": "C Introduction", "url": "https://www.w3schools.com/c/c_intro.php"}]}',
     '// Example Code\nprintf("Hello C!");'),
    ('660e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440002', 2, 'Conditionals', 'If, Else If, Else, and Switch statements',
     '{"introduction": "Learn decision-making in C.", "concepts": [{"title": "If-Else", "explanation": "Execute code based on conditions."}, {"title": "Switch", "explanation": "Handle multiple conditions."}], "key_terms": ["If", "Else", "Switch", "Case"], "resources": [{"title": "C If...Else", "url": "https://www.w3schools.com/c/c_conditions.php"}]}',
     '#include <stdio.h>\nint main() {\n    int x = 10;\n    if (x > 5) { printf("x is greater than 5"); }\n    return 0;\n}'),
    ('660e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440002', 3, 'Loops', 'While, Do-While, and For loops',
     '{"introduction": "Master iteration using loops.", "concepts": [{"title": "For Loop", "explanation": "Repeat a specific number of times."}, {"title": "While Loop", "explanation": "Repeat while condition is true."}], "key_terms": ["For", "While", "Do-While", "Break"], "resources": [{"title": "C While Loop", "url": "https://www.w3schools.com/c/c_while_loop.php"}]}',
     '#include <stdio.h>\nint main() {\n    for (int i = 0; i < 5; i++) { printf("%d\\n", i); }\n    return 0;\n}'),
    ('660e8400-e29b-41d4-a716-446655440014', '550e8400-e29b-41d4-a716-446655440002', 4, 'Arrays', 'Single and multi-dimensional arrays',
     '{"introduction": "Learn to store multiple values using arrays.", "concepts": [{"title": "Array Declaration", "explanation": "Create and initialize arrays."}, {"title": "Array Indexing", "explanation": "Access elements using indices."}], "key_terms": ["Array", "Index", "Element"], "resources": [{"title": "C Arrays", "url": "https://www.w3schools.com/c/c_arrays.php"}]}',
     '#include <stdio.h>\nint main() {\n    int arr[5] = {1, 2, 3, 4, 5};\n    printf("%d", arr[0]);\n    return 0;\n}'),
    ('660e8400-e29b-41d4-a716-446655440015', '550e8400-e29b-41d4-a716-446655440002', 5, 'Strings', 'Character arrays and string functions',
     '{"introduction": "Work with text data using strings in C.", "concepts": [{"title": "String Declaration", "explanation": "Create strings as character arrays."}, {"title": "String Functions", "explanation": "Use strlen, strcpy, strcat."}], "key_terms": ["String", "Character", "strlen"], "resources": [{"title": "C Strings", "url": "https://www.w3schools.com/c/c_strings.php"}]}',
     '#include <stdio.h>\n#include <string.h>\nint main() {\n    char str[] = "Hello";\n    printf("%lu", strlen(str));\n    return 0;\n}'),
    ('660e8400-e29b-41d4-a716-446655440016', '550e8400-e29b-41d4-a716-446655440002', 6, 'Functions', 'Function declaration, definition, and recursion',
     '{"introduction": "Create reusable code blocks with functions.", "concepts": [{"title": "Function Definition", "explanation": "Create your own functions."}, {"title": "Recursion", "explanation": "Functions that call themselves."}], "key_terms": ["Function", "Return", "Recursion"], "resources": [{"title": "C Functions", "url": "https://www.w3schools.com/c/c_functions.php"}]}',
     '#include <stdio.h>\nint add(int a, int b) { return a + b; }\nint main() { printf("%d", add(5, 3)); return 0; }')
ON DUPLICATE KEY UPDATE
    title=VALUES(title),
    description=VALUES(description),
    learning_materials=VALUES(learning_materials),
    code_snippet=VALUES(code_snippet);

-- ============================================================================
-- MACHINE LEARNING LEVELS
-- ============================================================================
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

-- ============================================================================
-- PYTHON LEVEL 1 MCQs (10 Questions)
-- ============================================================================
INSERT INTO questions (id, level_id, question_type, title, description, difficulty, explanation, concepts) VALUES
    ('770e8400-e29b-41d4-a716-446655440020', '660e8400-e29b-41d4-a716-446655440001', 'mcq', 'Python Output', 'What is the output of print(2 ** 3)?', 'easy', 'The ** operator represents exponentiation. 2 ** 3 = 8.', '["operators", "math"]'),
    ('770e8400-e29b-41d4-a716-446655440021', '660e8400-e29b-41d4-a716-446655440001', 'mcq', 'Variable Naming', 'Which of the following is an invalid variable name in Python?', 'easy', 'Variable names cannot start with a number.', '["variables", "syntax"]'),
    ('770e8400-e29b-41d4-a716-446655440022', '660e8400-e29b-41d4-a716-446655440001', 'mcq', 'Data Types', 'What is the type of x = 3.14?', 'easy', 'Numbers with decimal points are "float".', '["data types", "float"]'),
    ('770e8400-e29b-41d4-a716-446655440023', '660e8400-e29b-41d4-a716-446655440001', 'mcq', 'List Indexing', 'Given list L = [1, 2, 3], what is L[-1]?', 'easy', 'Negative indexing: -1 is the last item = 3.', '["lists", "indexing"]'),
    ('770e8400-e29b-41d4-a716-446655440024', '660e8400-e29b-41d4-a716-446655440001', 'mcq', 'String Concatenation', 'What is the result of "Hello" + "World"?', 'easy', 'The + operator concatenates strings.', '["strings", "operators"]'),
    ('770e8400-e29b-41d4-a716-446655440025', '660e8400-e29b-41d4-a716-446655440001', 'mcq', 'Boolean Logic', 'What is the result of True and False?', 'easy', 'AND requires both True. True and False = False.', '["boolean", "logic"]'),
    ('770e8400-e29b-41d4-a716-446655440026', '660e8400-e29b-41d4-a716-446655440001', 'mcq', 'Type Conversion', 'What does int("10") return?', 'easy', 'int() converts string to integer.', '["type casting"]'),
    ('770e8400-e29b-41d4-a716-446655440027', '660e8400-e29b-41d4-a716-446655440001', 'mcq', 'Indentation', 'Python uses indentation to define:', 'easy', 'Python uses whitespace indentation for code blocks.', '["syntax"]'),
    ('770e8400-e29b-41d4-a716-446655440028', '660e8400-e29b-41d4-a716-446655440001', 'mcq', 'Comments', 'Which character is used for single-line comments?', 'easy', 'The hash symbol (#) starts a comment.', '["comments", "syntax"]'),
    ('770e8400-e29b-41d4-a716-446655440029', '660e8400-e29b-41d4-a716-446655440001', 'mcq', 'Input', 'Which function is used to get user input?', 'easy', 'input() reads from stdin.', '["input", "io"]')
ON DUPLICATE KEY UPDATE id=id;

-- Python Level 1 MCQ Options
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

-- ============================================================================
-- PYTHON LEVEL 1 CODING PROBLEMS
-- ============================================================================
INSERT INTO questions (id, level_id, question_type, title, description, difficulty, reference_solution, explanation, concepts) VALUES
    ('770e8400-e29b-41d4-a716-446655440030', '660e8400-e29b-41d4-a716-446655440001', 'coding', 'Hello World', 'Write a function hello() that prints "Hello, World!" to the console.', 'easy', 'def hello():\n    print("Hello, World!")', 'The print() function sends data to standard output.', '["print", "functions"]'),
    ('770e8400-e29b-41d4-a716-446655440031', '660e8400-e29b-41d4-a716-446655440001', 'coding', 'Area of Circle', 'Write a function circle_area(radius) that returns the area of a circle. Use pi = 3.14159.', 'medium', 'def circle_area(radius):\n    pi = 3.14159\n    return pi * (radius ** 2)', 'Area = pi * r^2.', '["math", "functions"]')
ON DUPLICATE KEY UPDATE id=id;

-- Python coding test cases
INSERT INTO test_cases (id, question_id, input_data, expected_output, is_hidden, test_case_number) VALUES
    (UUID(), '770e8400-e29b-41d4-a716-446655440030', '', 'Hello, World!', FALSE, 1),
    (UUID(), '770e8400-e29b-41d4-a716-446655440030', 'any', 'Hello, World!', FALSE, 2),
    (UUID(), '770e8400-e29b-41d4-a716-446655440031', '1', '3.14159', FALSE, 1),
    (UUID(), '770e8400-e29b-41d4-a716-446655440031', '2', '12.56636', FALSE, 2),
    (UUID(), '770e8400-e29b-41d4-a716-446655440031', '10', '314.159', TRUE, 3)
ON DUPLICATE KEY UPDATE id=id;

-- ============================================================================
-- C LEVEL 1 MCQs (10 Questions)
-- ============================================================================
INSERT INTO questions (id, level_id, question_type, title, description, difficulty, explanation, concepts) VALUES
    ('770e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440011', 'mcq', 'Pointer Size', 'What is the size of a pointer variable on a 64-bit architecture?', 'easy', 'On 64-bit, pointers are 8 bytes.', '["pointers"]'),
    ('770e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440011', 'mcq', 'Dereference Operator', 'Which operator accesses the value at a pointer address?', 'easy', 'The asterisk (*) dereferences a pointer.', '["pointers", "operators"]'),
    ('770e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440011', 'mcq', 'Null Pointer', 'Which value assigns a pointer to nowhere?', 'easy', 'NULL or 0 indicates no valid memory.', '["pointers", "null"]'),
    ('770e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440011', 'mcq', 'MALLOC Return Type', 'What does malloc() return?', 'medium', 'malloc returns void*.', '["memory management"]'),
    ('770e8400-e29b-41d4-a716-446655440005', '660e8400-e29b-41d4-a716-446655440011', 'mcq', 'Freed Memory', 'What happens if you access memory after freeing it?', 'medium', 'Undefined behavior (dangling pointer).', '["memory management"]')
ON DUPLICATE KEY UPDATE id=id;

-- C Level 1 MCQ Options
INSERT INTO mcq_options (id, question_id, option_text, is_correct, option_letter) VALUES
    (UUID(), '770e8400-e29b-41d4-a716-446655440001', '4 bytes', FALSE, 'A'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440001', '8 bytes', TRUE, 'B'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440001', '2 bytes', FALSE, 'C'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440001', '16 bytes', FALSE, 'D'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440002', '&', FALSE, 'A'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440002', '*', TRUE, 'B'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440002', '->', FALSE, 'C'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440002', '.', FALSE, 'D'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440003', '0 or NULL', TRUE, 'A'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440003', '-1', FALSE, 'B'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440003', '1', FALSE, 'C'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440003', 'undefined', FALSE, 'D'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440004', 'int*', FALSE, 'A'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440004', 'void*', TRUE, 'B'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440004', 'char*', FALSE, 'C'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440004', 'null', FALSE, 'D'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440005', 'Compile error', FALSE, 'A'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440005', 'Undefined behavior', TRUE, 'B'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440005', 'Returns 0', FALSE, 'C'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440005', 'Nothing happens', FALSE, 'D')
ON DUPLICATE KEY UPDATE id=id;

-- ============================================================================
-- C LEVEL 1 CODING PROBLEMS
-- ============================================================================
INSERT INTO questions (id, level_id, question_type, title, description, difficulty, reference_solution, explanation, concepts) VALUES
    ('770e8400-e29b-41d4-a716-446655440011', '660e8400-e29b-41d4-a716-446655440011', 'coding', 'Swap Two Numbers', 'Write a function void swap(int *a, int *b) that swaps values using pointers.', 'medium', 'void swap(int *a, int *b) { int temp = *a; *a = *b; *b = temp; }', 'Swap using dereference and temp variable.', '["pointers", "functions"]'),
    ('770e8400-e29b-41d4-a716-446655440012', '660e8400-e29b-41d4-a716-446655440011', 'coding', 'Calculate Array Sum', 'Write int sumArray(int *arr, int size) using pointer arithmetic.', 'hard', 'int sumArray(int *arr, int size) { int sum = 0; for(int i=0; i<size; i++) { sum += *(arr + i); } return sum; }', 'Pointer arithmetic: *(arr + i) = arr[i].', '["pointers", "arrays"]')
ON DUPLICATE KEY UPDATE id=id;

-- C coding test cases
INSERT INTO test_cases (id, question_id, input_data, expected_output, is_hidden, test_case_number) VALUES
    (UUID(), '770e8400-e29b-41d4-a716-446655440011', '10 20', '20 10', FALSE, 1),
    (UUID(), '770e8400-e29b-41d4-a716-446655440011', '5 5', '5 5', FALSE, 2),
    (UUID(), '770e8400-e29b-41d4-a716-446655440011', '-1 1', '1 -1', TRUE, 3),
    (UUID(), '770e8400-e29b-41d4-a716-446655440012', '5\n1 2 3 4 5', '15', FALSE, 1),
    (UUID(), '770e8400-e29b-41d4-a716-446655440012', '3\n10 20 30', '60', FALSE, 2),
    (UUID(), '770e8400-e29b-41d4-a716-446655440012', '4\n-1 -2 -3 -4', '-10', TRUE, 3)
ON DUPLICATE KEY UPDATE id=id;

-- ============================================================================
-- ML LEVEL 1 MCQs (10 Questions)
-- ============================================================================
INSERT INTO questions (id, level_id, question_type, title, description, difficulty, explanation, concepts) VALUES
    ('770e8400-e29b-41d4-a716-446655440040', '660e8400-e29b-41d4-a716-446655440021', 'mcq', 'Supervised vs Unsupervised', 'Which is an example of supervised learning?', 'easy', 'Spam detection uses labeled data.', '["supervised learning"]'),
    ('770e8400-e29b-41d4-a716-446655440041', '660e8400-e29b-41d4-a716-446655440021', 'mcq', 'Features', 'In housing data, "Number of Bedrooms" is a:', 'easy', 'Features are input variables.', '["features"]'),
    ('770e8400-e29b-41d4-a716-446655440042', '660e8400-e29b-41d4-a716-446655440021', 'mcq', 'Target Variable', 'What is the Target variable?', 'easy', 'The variable the model predicts.', '["target"]'),
    ('770e8400-e29b-41d4-a716-446655440043', '660e8400-e29b-41d4-a716-446655440021', 'mcq', 'Regression', 'Which is a regression problem?', 'easy', 'Predicting continuous values like price.', '["regression"]'),
    ('770e8400-e29b-41d4-a716-446655440044', '660e8400-e29b-41d4-a716-446655440021', 'mcq', 'Classification', 'Which is a classification problem?', 'easy', 'Predicting categories like benign/malignant.', '["classification"]')
ON DUPLICATE KEY UPDATE id=id;

-- ML Level 1 MCQ Options
INSERT INTO mcq_options (id, question_id, option_text, is_correct, option_letter) VALUES
    (UUID(), '770e8400-e29b-41d4-a716-446655440040', 'Clustering customers', FALSE, 'A'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440040', 'Spam email detection', TRUE, 'B'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440040', 'Dimensionality reduction', FALSE, 'C'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440040', 'Data visualization', FALSE, 'D'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440041', 'Feature', TRUE, 'A'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440041', 'Target', FALSE, 'B'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440041', 'Label', FALSE, 'C'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440041', 'Noise', FALSE, 'D'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440042', 'The variable we want to predict', TRUE, 'A'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440042', 'The input variables', FALSE, 'B'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440042', 'The noise in data', FALSE, 'C'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440042', 'The testing data', FALSE, 'D'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440043', 'Predicting house price', TRUE, 'A'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440043', 'Predicting cat or dog', FALSE, 'B'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440043', 'Predicting spam or ham', FALSE, 'C'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440043', 'Grouping similar items', FALSE, 'D'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440044', 'Predicting temperature', FALSE, 'A'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440044', 'Predicting tumor benign/malignant', TRUE, 'B'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440044', 'Predicting stock price', FALSE, 'C'),
    (UUID(), '770e8400-e29b-41d4-a716-446655440044', 'Predicting height', FALSE, 'D')
ON DUPLICATE KEY UPDATE id=id;

-- ============================================================================
-- ML LEVEL 1 CODING PROBLEMS
-- ============================================================================
INSERT INTO questions (id, level_id, question_type, title, description, difficulty, reference_solution, explanation, concepts) VALUES
    ('770e8400-e29b-41d4-a716-446655440050', '660e8400-e29b-41d4-a716-446655440021', 'coding', 'Mean Calculation', 'Write a function mean(values) that calculates the arithmetic mean.', 'easy', 'def mean(values):\n    if not values: return 0\n    return sum(values) / len(values)', 'Mean = sum / count.', '["stats", "mean"]'),
    ('770e8400-e29b-41d4-a716-446655440051', '660e8400-e29b-41d4-a716-446655440021', 'coding', 'Linear Prediction', 'Write predict(m, c, x) that returns y = mx + c.', 'easy', 'def predict(m, c, x):\n    return m * x + c', 'Line equation: y = mx + c.', '["linear algebra"]')
ON DUPLICATE KEY UPDATE id=id;

-- ML coding test cases
INSERT INTO test_cases (id, question_id, input_data, expected_output, is_hidden, test_case_number) VALUES
    (UUID(), '770e8400-e29b-41d4-a716-446655440050', '1,2,3,4,5', '3.0', FALSE, 1),
    (UUID(), '770e8400-e29b-41d4-a716-446655440050', '10,20,30', '20.0', FALSE, 2),
    (UUID(), '770e8400-e29b-41d4-a716-446655440051', '2,1,3', '7', FALSE, 1),
    (UUID(), '770e8400-e29b-41d4-a716-446655440051', '1,0,5', '5', FALSE, 2)
ON DUPLICATE KEY UPDATE id=id;

SELECT 'Core seed data loaded successfully!' AS status;
