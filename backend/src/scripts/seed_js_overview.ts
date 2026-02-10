/**
 * Seed JavaScript Course Overview Data
 * 
 * This script updates the existing JavaScript course with:
 * 1. Course-level overview text (shown as collapsible on course levels page)
 * 2. Each level's learning_materials JSON (shown in Level Overview page)
 *    - introduction, concepts, key_terms, resources, example_code
 */

import pool from '../config/database';
import { getRows } from '../utils/mysqlHelper';
import { randomUUID } from 'crypto';

const COURSE_OVERVIEW = `📘 JavaScript Course Overview

This comprehensive JavaScript course is organized into 3 progressive levels designed to take you from fundamentals to advanced, production-ready JavaScript skills.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🟢 Level 1: Fundamentals of JavaScript
Master the core building blocks of JavaScript — variables, data types, operators, control flow, functions, arrays, and objects. Learn best practices for naming conventions and writing clean, readable code.

🟡 Level 2: DOM Manipulation & Event Handling
Learn to interact with web pages dynamically using the Document Object Model (DOM). Handle user events, implement event delegation, validate forms on the client side, and submit data asynchronously.

🔴 Level 3: Asynchronous JavaScript & Modern ES6+ Features
Dive into asynchronous programming with callbacks, promises, and async/await. Explore modern ES6+ features including arrow functions, destructuring, spread/rest operators, template literals, JavaScript modules, and bundlers like Webpack.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

By the end of this course, you will be able to write modern, clean, and efficient JavaScript for real-world applications.`;

// ==========================================
// Level 1: Fundamentals of JavaScript
// ==========================================
const LEVEL_1_MATERIALS = {
    introduction: "Master the core foundations of JavaScript programming. This level covers everything from basic syntax using var, let, and const to working with data types, operators, and writing clean, readable code. You'll explore control flow with conditionals and loops, understand how to declare and use functions, and learn to manipulate arrays and objects effectively using powerful built-in methods.",
    concepts: [
        {
            title: "Basic Syntax & Variables",
            explanation: "Understand JavaScript syntax including variable declarations using var, let, and const. Learn about data types (strings, numbers, booleans, null, undefined, symbols, BigInt), and work with arithmetic, comparison, logical, and assignment operators."
        },
        {
            title: "Naming Conventions & Best Practices",
            explanation: "Follow industry-standard naming conventions: camelCase for variables and functions, PascalCase for classes, UPPER_SNAKE_CASE for constants. Write clean, self-documenting code with meaningful names, proper indentation, and consistent formatting."
        },
        {
            title: "Control Flow Statements",
            explanation: "Explore control flow with if/else conditionals, switch statements for multi-branch logic, and loops including for, while, do-while, and for...of. Understand break, continue, and how to choose the right control structure for each scenario."
        },
        {
            title: "Functions",
            explanation: "Master function declaration, function expressions, and invocation patterns. Understand parameters vs arguments, default parameters, return values, and the concept of scope. Learn how functions are first-class citizens in JavaScript."
        },
        {
            title: "Arrays & Array Methods",
            explanation: "Learn how to create and manipulate arrays. Master essential iteration methods like forEach, map, filter, reduce, find, and some/every. Understand common operations such as push, pop, slice, splice, and the spread operator for arrays."
        },
        {
            title: "Objects & Object Manipulation",
            explanation: "Work with JavaScript objects using dot notation and bracket notation. Understand object creation patterns, property enumeration with Object.keys(), Object.values(), and Object.entries(). Learn destructuring, the spread operator for objects, and JSON serialization."
        }
    ],
    key_terms: [
        "var", "let", "const", "data types", "operators", "camelCase",
        "if/else", "switch", "for loop", "while loop",
        "function declaration", "parameters", "return value", "scope",
        "array", "forEach", "map", "filter", "reduce",
        "object", "dot notation", "destructuring", "JSON"
    ],
    resources: [
        { title: "MDN: JavaScript Basics", url: "https://developer.mozilla.org/en-US/docs/Learn/Getting_started_with_the_web/JavaScript_basics" },
        { title: "MDN: Grammar & Types", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Grammar_and_types" },
        { title: "MDN: Functions Guide", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions" },
        { title: "MDN: Array Reference", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array" },
        { title: "MDN: Working with Objects", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Working_with_objects" }
    ],
    example_code: `// ===== Variables =====
let userName = "Alice";        // Mutable variable
const MAX_SCORE = 100;         // Immutable constant
var legacyVar = "avoid this";  // Function-scoped (prefer let/const)

// ===== Control Flow =====
const score = 85;
if (score >= 90) {
  console.log("Excellent!");
} else if (score >= 70) {
  console.log("Good job!");   // ← This runs
} else {
  console.log("Keep practicing!");
}

// ===== Functions =====
function greet(name, greeting = "Hello") {
  return \`\${greeting}, \${name}!\`;
}
console.log(greet("Alice"));            // "Hello, Alice!"
console.log(greet("Bob", "Welcome"));   // "Welcome, Bob!"

// ===== Arrays & Methods =====
const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const doubled = numbers.map(n => n * 2);
// [2, 4, 6, 8, 10, 12, 14, 16, 18, 20]

const evens = numbers.filter(n => n % 2 === 0);
// [2, 4, 6, 8, 10]

const sum = numbers.reduce((acc, n) => acc + n, 0);
// 55

// ===== Objects =====
const student = {
  name: "Alice",
  age: 22,
  courses: ["JavaScript", "React"]
};

const { name, age } = student;  // Destructuring
const keys = Object.keys(student);  // ["name", "age", "courses"]`
};

// ==========================================
// Level 2: DOM Manipulation & Event Handling
// ==========================================
const LEVEL_2_MATERIALS = {
    introduction: "Learn how to bring web pages to life by interacting with the Document Object Model (DOM). This level teaches you to select, traverse, and modify HTML elements dynamically, handle user interactions through event listeners, implement event delegation for efficient event handling, validate forms on the client side, and submit data to servers asynchronously.",
    concepts: [
        {
            title: "Document Object Model (DOM)",
            explanation: "The DOM is a tree-like representation of an HTML document. Every element, attribute, and text becomes a node in this tree. JavaScript can access and manipulate this structure using methods like getElementById(), querySelector(), and querySelectorAll() to select elements."
        },
        {
            title: "DOM Traversal & Manipulation",
            explanation: "Navigate the DOM tree using properties like parentNode, children, nextSibling, and firstChild. Modify content with innerHTML, textContent, and setAttribute(). Create new elements with createElement() and appendChild(). Dynamically add, remove, or modify CSS classes using classList."
        },
        {
            title: "Event Listeners & Handling",
            explanation: "Respond to user interactions using addEventListener(). Handle events like click, input, submit, keydown, mouseover, and more. Understand the event object, event.target, and event.preventDefault() for controlling default browser behavior."
        },
        {
            title: "Event Delegation & Bubbling",
            explanation: "Events bubble up from child to parent elements in the DOM. Event delegation leverages this by attaching a single listener to a parent element to handle events for all its children. This improves performance and handles dynamically added elements efficiently."
        },
        {
            title: "Client-Side Form Validation",
            explanation: "Validate user input before submission using JavaScript. Check for required fields, email formats, password strength, and custom rules. Provide real-time feedback with error messages and visual indicators. Use the Constraint Validation API for built-in validation."
        },
        {
            title: "Asynchronous Form Submission",
            explanation: "Handle form submissions without page reloads using event.preventDefault() and the Fetch API or XMLHttpRequest. Serialize form data, send it to a server asynchronously, handle responses, and display success or error messages dynamically."
        }
    ],
    key_terms: [
        "DOM", "node", "element", "querySelector", "getElementById",
        "parentNode", "children", "createElement", "appendChild", "classList",
        "addEventListener", "event object", "event.target", "preventDefault",
        "event bubbling", "event delegation", "event capturing",
        "form validation", "Fetch API", "FormData", "async submission"
    ],
    resources: [
        { title: "MDN: Introduction to the DOM", url: "https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Introduction" },
        { title: "MDN: DOM Manipulation", url: "https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Client-side_web_APIs/Manipulating_documents" },
        { title: "MDN: Event Reference", url: "https://developer.mozilla.org/en-US/docs/Web/Events" },
        { title: "MDN: Event Delegation", url: "https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks/Event_bubbling" },
        { title: "MDN: Client-Side Form Validation", url: "https://developer.mozilla.org/en-US/docs/Learn/Forms/Form_validation" },
        { title: "MDN: Fetch API", url: "https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch" }
    ],
    example_code: `// ===== DOM Selection =====
const heading = document.getElementById("main-title");
const buttons = document.querySelectorAll(".btn");
const firstCard = document.querySelector(".card:first-child");

// ===== DOM Manipulation =====
heading.textContent = "Welcome to JavaScript!";
heading.classList.add("highlight");

const newParagraph = document.createElement("p");
newParagraph.textContent = "Dynamically added content!";
document.body.appendChild(newParagraph);

// ===== Event Handling =====
const btn = document.querySelector("#submit-btn");
btn.addEventListener("click", (event) => {
  event.preventDefault();
  console.log("Button clicked!", event.target);
});

// ===== Event Delegation =====
// Instead of adding listeners to each <li>, add one to <ul>
const list = document.querySelector("#todo-list");
list.addEventListener("click", (event) => {
  if (event.target.tagName === "LI") {
    event.target.classList.toggle("completed");
  }
});

// ===== Form Validation =====
const form = document.querySelector("#signup-form");
form.addEventListener("submit", (event) => {
  const email = form.querySelector("#email").value;
  const password = form.querySelector("#password").value;

  if (!email.includes("@")) {
    event.preventDefault();
    alert("Please enter a valid email!");
    return;
  }
  if (password.length < 8) {
    event.preventDefault();
    alert("Password must be at least 8 characters!");
    return;
  }
});

// ===== Async Form Submission =====
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(form);

  try {
    const response = await fetch("/api/signup", {
      method: "POST",
      body: JSON.stringify(Object.fromEntries(formData)),
      headers: { "Content-Type": "application/json" }
    });
    const result = await response.json();
    console.log("Success:", result);
  } catch (error) {
    console.error("Submission failed:", error);
  }
});`
};

// ==========================================
// Level 3: Async JS & ES6+ Features
// ==========================================
const LEVEL_3_MATERIALS = {
    introduction: "Dive into the modern side of JavaScript. This level covers asynchronous programming patterns — from callbacks to promises to async/await — enabling you to handle API calls, timers, and concurrent operations gracefully. You'll also master ES6+ features like arrow functions, destructuring, spread/rest operators, template literals, and learn how to organize large codebases with JavaScript modules and bundlers like Webpack.",
    concepts: [
        {
            title: "Asynchronous Programming",
            explanation: "JavaScript is single-threaded but handles async operations via the event loop. Master callbacks (and callback hell), Promises (with .then/.catch/.finally chaining), and the async/await syntax for writing clean, readable asynchronous code. Understand Promise.all(), Promise.race(), and error handling patterns."
        },
        {
            title: "Arrow Functions & Template Literals",
            explanation: "Arrow functions provide a concise syntax (const add = (a, b) => a + b) and lexically bind 'this'. Template literals use backticks for multi-line strings and embedded expressions (\\`Hello, \\${name}!\\`). Both are essential modern JavaScript features used extensively in frameworks."
        },
        {
            title: "Destructuring & Spread/Rest Operators",
            explanation: "Destructuring extracts values from arrays ([a, b] = [1, 2]) and objects ({name, age} = person). The spread operator (...) expands iterables into individual elements for copying/merging. The rest parameter (...args) collects remaining arguments into an array."
        },
        {
            title: "let, const & Block Scoping",
            explanation: "Unlike var (function-scoped), let and const are block-scoped — they only exist within their enclosing {}. const prevents reassignment (but not mutation of objects/arrays). Use const by default, let when reassignment is needed, and avoid var entirely in modern code."
        },
        {
            title: "JavaScript Modules (import/export)",
            explanation: "Modules let you split code into reusable files. Use 'export' to expose functions, classes, or variables, and 'import' to consume them. Understand named exports vs default exports, re-exporting, and dynamic imports with import(). Modules enable tree-shaking and better code organization."
        },
        {
            title: "Module Bundlers (Webpack)",
            explanation: "Webpack bundles JavaScript modules and their dependencies into optimized files for the browser. It handles code splitting, lazy loading, asset management (CSS, images), and development tools like hot module replacement. Understand entry points, output configuration, loaders, and plugins."
        }
    ],
    key_terms: [
        "callback", "Promise", "async", "await", "event loop",
        "Promise.all", "Promise.race", ".then", ".catch",
        "arrow function", "template literal", "backtick",
        "destructuring", "spread operator", "rest parameter",
        "let", "const", "block scope", "hoisting",
        "import", "export", "default export", "named export",
        "Webpack", "bundler", "code splitting", "tree-shaking"
    ],
    resources: [
        { title: "MDN: Asynchronous JavaScript", url: "https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Asynchronous" },
        { title: "MDN: Promises", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise" },
        { title: "MDN: async/await", url: "https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Asynchronous/Promises" },
        { title: "MDN: Arrow Functions", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions" },
        { title: "MDN: Destructuring Assignment", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment" },
        { title: "MDN: JavaScript Modules", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules" },
        { title: "Webpack Official Documentation", url: "https://webpack.js.org/concepts/" }
    ],
    example_code: `// ===== Callbacks vs Promises vs Async/Await =====

// Callback style (avoid nesting!)
function fetchDataCallback(url, callback) {
  setTimeout(() => callback(null, { data: "result" }), 1000);
}

// Promise style
function fetchDataPromise(url) {
  return new Promise((resolve, reject) => {
    setTimeout(() => resolve({ data: "result" }), 1000);
  });
}
fetchDataPromise("/api/users")
  .then(data => console.log(data))
  .catch(err => console.error(err));

// Async/Await style (recommended!)
async function fetchUsers() {
  try {
    const response = await fetch("/api/users");
    const users = await response.json();
    console.log(users);
  } catch (error) {
    console.error("Failed to fetch:", error);
  }
}

// Parallel execution with Promise.all
async function fetchAll() {
  const [users, posts] = await Promise.all([
    fetch("/api/users").then(r => r.json()),
    fetch("/api/posts").then(r => r.json())
  ]);
  console.log(users, posts);
}

// ===== Arrow Functions =====
const multiply = (a, b) => a * b;
const greet = name => \`Hello, \${name}!\`;
const getUser = () => ({ name: "Alice", age: 25 });

// ===== Destructuring =====
const [first, second, ...rest] = [10, 20, 30, 40, 50];
// first=10, second=20, rest=[30,40,50]

const { name, age, city = "Unknown" } = { name: "Bob", age: 30 };

// ===== Spread & Rest =====
const arr1 = [1, 2, 3];
const arr2 = [...arr1, 4, 5];  // [1, 2, 3, 4, 5]

const obj1 = { a: 1, b: 2 };
const obj2 = { ...obj1, c: 3 };  // { a: 1, b: 2, c: 3 }

function sum(...numbers) {
  return numbers.reduce((acc, n) => acc + n, 0);
}

// ===== Modules =====
// utils.js
// export const add = (a, b) => a + b;
// export default class Calculator { ... }

// main.js
// import Calculator, { add } from './utils.js';`
};

// ==========================================
// Main Seeder Function
// ==========================================
async function seedJavaScriptOverview() {
    try {
        console.log('🔍 Looking for existing JavaScript course...');

        // Find the JavaScript course
        const courseResult = await pool.query(
            "SELECT id, title, total_levels FROM courses WHERE LOWER(title) LIKE '%javascript%'"
        );
        let courses = getRows(courseResult);
        let courseId: string;

        if (courses.length === 0) {
            console.log('⚠️  No JavaScript course found. Creating one...');

            // Create the JavaScript course
            courseId = randomUUID();
            await pool.query(
                'INSERT INTO courses (id, title, description, total_levels, created_at) VALUES (?, ?, ?, ?, NOW())',
                [
                    courseId,
                    'JavaScript',
                    'Master JavaScript from fundamentals to advanced asynchronous programming and modern ES6+ features.',
                    3
                ]
            );
            console.log(`✅ Created JavaScript course (ID: ${courseId})`);

            // Create skills
            const skillIds = [randomUUID(), randomUUID(), randomUUID()];
            await pool.query(
                `INSERT INTO skills (id, name, description, category, difficulty_tier, created_at, updated_at) VALUES
                (?, 'JS: Fundamentals', 'Variables, data types, control flow, functions, arrays, objects', 'JavaScript', 'beginner', NOW(), NOW()),
                (?, 'JS: DOM & Events', 'DOM manipulation, event handling, delegation, form validation', 'JavaScript', 'intermediate', NOW(), NOW()),
                (?, 'JS: Async & ES6+', 'Promises, async/await, arrow functions, modules, bundlers', 'JavaScript', 'advanced', NOW(), NOW())`,
                skillIds
            );
            console.log('✅ Created 3 skills');

            // Create skill prerequisites
            await pool.query(
                `INSERT INTO skill_prerequisites (id, skill_id, prerequisite_skill_id, relationship_type, created_at) VALUES
                (?, ?, ?, 'required', NOW()),
                (?, ?, ?, 'required', NOW())`,
                [randomUUID(), skillIds[1], skillIds[0], randomUUID(), skillIds[2], skillIds[1]]
            );
            console.log('✅ Created skill prerequisites');

            // Create 3 levels
            const levelIds = [randomUUID(), randomUUID(), randomUUID()];
            await pool.query(
                `INSERT INTO levels (id, course_id, level_number, title, description, topic_description, created_at) VALUES
                (?, ?, 0, 'Level 0: JS Fundamentals', 'Core building blocks of JavaScript',
                 'Master variables, data types, operators, control flow, functions, arrays, and objects.', NOW()),
                (?, ?, 1, 'Level 1: DOM & Events', 'Dynamic web page interaction',
                 'Learn DOM manipulation, event handling, delegation, and client-side form validation.', NOW()),
                (?, ?, 2, 'Level 2: Async & ES6+', 'Modern JavaScript patterns',
                 'Master async/await, promises, arrow functions, destructuring, modules, and bundlers.', NOW())`,
                [levelIds[0], courseId, levelIds[1], courseId, levelIds[2], courseId]
            );
            console.log('✅ Created 3 levels');

            // Create level-skill mappings
            await pool.query(
                `INSERT INTO level_skills (id, level_id, skill_id, contribution_type, weight, created_at) VALUES
                (?, ?, ?, 'teaches', 10, NOW()),
                (?, ?, ?, 'teaches', 10, NOW()),
                (?, ?, ?, 'assesses', 10, NOW())`,
                [randomUUID(), levelIds[0], skillIds[0],
                randomUUID(), levelIds[1], skillIds[1],
                randomUUID(), levelIds[2], skillIds[2]]
            );
            console.log('✅ Created level-skill mappings');

            // Create sample questions for each level
            // Level 0 questions (Fundamentals)
            await pool.query(
                `INSERT INTO questions (id, level_id, question_type, title, description, difficulty, created_at) VALUES
                (?, ?, 'mcq', 'Variable Declarations', 'What is the difference between let, const, and var?', 'easy', NOW()),
                (?, ?, 'mcq', 'Data Types', 'Which of the following is NOT a primitive data type in JavaScript?', 'easy', NOW()),
                (?, ?, 'mcq', 'Array Methods', 'What does Array.prototype.map() return?', 'medium', NOW()),
                (?, ?, 'coding', 'Sum Array', 'Write a function that returns the sum of all numbers in an array using reduce.', 'easy', NOW()),
                (?, ?, 'coding', 'Object Keys', 'Write a function that returns all keys of a nested object.', 'medium', NOW())`,
                [randomUUID(), levelIds[0], randomUUID(), levelIds[0], randomUUID(), levelIds[0],
                randomUUID(), levelIds[0], randomUUID(), levelIds[0]]
            );

            // Level 1 questions (DOM & Events)
            await pool.query(
                `INSERT INTO questions (id, level_id, question_type, title, description, difficulty, created_at) VALUES
                (?, ?, 'mcq', 'DOM Selection', 'What does document.querySelector() return?', 'easy', NOW()),
                (?, ?, 'mcq', 'Event Bubbling', 'In which direction does event bubbling propagate?', 'medium', NOW()),
                (?, ?, 'mcq', 'preventDefault', 'What does event.preventDefault() do?', 'easy', NOW()),
                (?, ?, 'coding', 'Toggle Class', 'Write code to toggle a CSS class on a button click.', 'easy', NOW()),
                (?, ?, 'coding', 'Event Delegation', 'Implement event delegation for a dynamic list.', 'medium', NOW())`,
                [randomUUID(), levelIds[1], randomUUID(), levelIds[1], randomUUID(), levelIds[1],
                randomUUID(), levelIds[1], randomUUID(), levelIds[1]]
            );

            // Level 2 questions (Async & ES6+)
            await pool.query(
                `INSERT INTO questions (id, level_id, question_type, title, description, difficulty, created_at) VALUES
                (?, ?, 'mcq', 'Promises', 'What state is a Promise in immediately after creation?', 'medium', NOW()),
                (?, ?, 'mcq', 'Arrow Functions', 'How do arrow functions differ from regular functions?', 'medium', NOW()),
                (?, ?, 'mcq', 'Destructuring', 'What does const {a, b} = obj do?', 'easy', NOW()),
                (?, ?, 'coding', 'Async Fetch', 'Write an async function that fetches data from an API and handles errors.', 'medium', NOW()),
                (?, ?, 'coding', 'Module Export', 'Create a module that exports a Calculator class with basic operations.', 'hard', NOW())`,
                [randomUUID(), levelIds[2], randomUUID(), levelIds[2], randomUUID(), levelIds[2],
                randomUUID(), levelIds[2], randomUUID(), levelIds[2]]
            );

            console.log('✅ Created 15 sample questions (5 per level)');
        } else {
            courseId = courses[0].id;
            console.log(`✅ Found course: "${courses[0].title}" (ID: ${courseId}, Levels: ${courses[0].total_levels})`);
        }

        // Step 1: Update course overview
        console.log('\n📝 Updating course overview...');
        await pool.query(
            'UPDATE courses SET overview = ? WHERE id = ?',
            [COURSE_OVERVIEW, courseId]
        );
        console.log('✅ Course overview updated!');

        // Step 2: Get existing levels
        console.log('\n🔍 Finding existing levels...');
        const levelsResult = await pool.query(
            'SELECT id, level_number, title FROM levels WHERE course_id = ? ORDER BY level_number',
            [courseId]
        );
        const levels = getRows(levelsResult);
        console.log(`✅ Found ${levels.length} levels:`);
        levels.forEach((l: any) => console.log(`   Level ${l.level_number}: ${l.title} (${l.id})`));

        if (levels.length < 3) {
            console.error(`❌ Expected at least 3 levels, found ${levels.length}. Aborting.`);
            process.exit(1);
        }

        // Map levels to their materials
        const levelMaterials = [
            { level: levels[0], materials: LEVEL_1_MATERIALS, title: 'Fundamentals of JavaScript' },
            { level: levels[1], materials: LEVEL_2_MATERIALS, title: 'DOM Manipulation & Event Handling' },
            { level: levels[2], materials: LEVEL_3_MATERIALS, title: 'Asynchronous JavaScript & ES6+ Features' },
        ];

        // Step 3: Update each level's learning_materials
        for (const { level, materials, title } of levelMaterials) {
            console.log(`\n📝 Updating Level ${level.level_number}: "${level.title}"...`);

            const materialsJson = JSON.stringify(materials);

            await pool.query(
                'UPDATE levels SET learning_materials = ? WHERE id = ?',
                [materialsJson, level.id]
            );

            console.log(`✅ Level ${level.level_number} updated with:`);
            console.log(`   • Introduction: ${materials.introduction.substring(0, 60)}...`);
            console.log(`   • ${materials.concepts.length} concepts`);
            console.log(`   • ${materials.key_terms.length} key terms`);
            console.log(`   • ${materials.resources.length} resources`);
            console.log(`   • Example code: ${materials.example_code.length} chars`);
        }

        // If there are more than 3 levels, log which ones were not updated
        if (levels.length > 3) {
            console.log(`\n⚠️  Note: ${levels.length - 3} additional level(s) were not updated (only levels 1-3 had content provided).`);
        }

        console.log('\n✨ JavaScript course overview seeding completed successfully!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📋 Summary:');
        console.log(`   • Course overview: Updated ✅`);
        console.log(`   • Level 1 (Fundamentals): Updated ✅`);
        console.log(`   • Level 2 (DOM & Events): Updated ✅`);
        console.log(`   • Level 3 (Async & ES6+): Updated ✅`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        process.exit(0);
    } catch (error: any) {
        console.error('❌ Error seeding JavaScript overview:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

seedJavaScriptOverview();

