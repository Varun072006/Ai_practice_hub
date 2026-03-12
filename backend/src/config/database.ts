import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Parse DATABASE_URL or use individual connection parameters
let connectionConfig: mysql.PoolOptions;

if (process.env.DATABASE_URL) {
  let cleanUrl = process.env.DATABASE_URL;
  // Remove any malformed SSL JSON from URL if present
  cleanUrl = cleanUrl.replace(/\?ssl=\{.*?\}/, '');

  const url = new URL(cleanUrl);

  connectionConfig = {
    host: url.hostname,
    port: parseInt(url.port) || 3306,
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1), // Remove leading '/'
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    multipleStatements: true,
    connectTimeout: 60000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    timezone: 'Z',
  };
} else {
  // Default to localhost MySQL for local development, or Docker service name when in container
  const isDocker = process.env.DOCKER_ENV === 'true';
  const defaultHost = isDocker ? 'mysql' : 'localhost';

  connectionConfig = {
    host: process.env.DB_HOST || defaultHost,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'practicehub',
    password: process.env.DB_PASSWORD || 'practicehub123',
    database: process.env.DB_NAME || 'practice_hub',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    multipleStatements: true,
    connectTimeout: 60000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    timezone: 'Z',
  };
}

const pool = mysql.createPool(connectionConfig);

// Handle new connections
pool.on('connection', (connection: any) => {
  console.log('New MySQL connection established');

  connection.on('error', (err: any) => {
    console.error('Database connection error:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET') {
      console.log('Database connection lost. Pool will automatically reconnect.');
    }
  });
});

export default pool;