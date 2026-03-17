import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
  const connection = await mysql.createConnection('mysql://practicehub:practicehub123@localhost:3306/practice_hub');
  
  try {
    console.log('Connected to MySQL');
    
    const [rows] = await connection.query('SELECT username FROM users WHERE username = ?', ['testuser']);
    
    if (rows.length === 0) {
      const id = uuidv4();
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('test123', salt);
      
      await connection.query(
        'INSERT INTO users (id, username, password_hash, role, name, email) VALUES (?, ?, ?, ?, ?, ?)',
        [id, 'testuser', hashedPassword, 'student', 'Test User', 'testuser@example.com']
      );
      console.log('Created testuser/test123');
    } else {
      console.log('testuser already exists');
    }
    
    const [allUsers] = await connection.query('SELECT username, role, name FROM users');
    console.log('\nCurrent Users in DB:');
    console.table(allUsers);
    
  } catch (error) {
    console.error('Error seeding user:', error);
  } finally {
    await connection.end();
  }
}

seed();
