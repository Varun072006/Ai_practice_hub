const fs = require('fs');
try {
    const content = fs.readFileSync('init_db_output.txt', 'utf16le');
    console.log(content);
} catch (e) {
    console.log('Error reading file:', e.message);
    try {
        const content = fs.readFileSync('init_db_output.txt', 'utf8');
        console.log(content);
    } catch (e2) {
        console.error(e2);
    }
}
