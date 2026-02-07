import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';

// Database connection configuration
const connectionConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'hack',
  database: process.env.DB_NAME || 'rumor_verification',
};

// Create connection pool
const pool = mysql.createPool({
  ...connectionConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Create drizzle instance
export const db = drizzle(pool, { schema, mode: 'default' });

// Helper to get a raw connection for transactions
export async function getConnection() {
  return await pool.getConnection();
}

// Initialize database (create tables if not exist)
export async function initializeDatabase() {
  const connection = await pool.getConnection();
  try {
    // Create database if not exists
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${connectionConfig.database}`);
    await connection.query(`USE ${connectionConfig.database}`);

    // Create tables
    await connection.query(`
      CREATE TABLE IF NOT EXISTS rumors (
        rumor_id VARCHAR(36) PRIMARY KEY,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        truth_score DECIMAL(5,4) DEFAULT 0.5000 NOT NULL,
        status ENUM('open', 'verified', 'disputed', 'deleted') DEFAULT 'open' NOT NULL,
        vote_count INT DEFAULT 0 NOT NULL,
        total_credibility_weight DECIMAL(10,4) DEFAULT 0.0000 NOT NULL,
        weighted_vote_sum DECIMAL(10,4) DEFAULT 0.0000 NOT NULL,
        locked_at TIMESTAMP NULL,
        INDEX idx_status (status),
        INDEX idx_truth_score (truth_score),
        INDEX idx_created_at (created_at)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS anonymous_users (
        user_token VARCHAR(64) PRIMARY KEY,
        credibility DECIMAL(5,4) DEFAULT 0.5000 NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        total_votes INT DEFAULT 0 NOT NULL,
        correct_votes INT DEFAULT 0 NOT NULL
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS votes (
        vote_hash VARCHAR(64) PRIMARY KEY,
        rumor_id VARCHAR(36) NOT NULL,
        vote_value INT NOT NULL,
        voter_credibility DECIMAL(5,4) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_rumor_id (rumor_id)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS comments (
        comment_id VARCHAR(36) PRIMARY KEY,
        rumor_id VARCHAR(36) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_comment_rumor (rumor_id)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS rumor_references (
        source_rumor_id VARCHAR(36) NOT NULL,
        target_rumor_id VARCHAR(36) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (source_rumor_id, target_rumor_id),
        INDEX idx_source (source_rumor_id),
        INDEX idx_target (target_rumor_id)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS pending_credibility_updates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_token VARCHAR(64) NOT NULL,
        rumor_id VARCHAR(36) NOT NULL,
        vote_value INT NOT NULL,
        processed INT DEFAULT 0 NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_pending_user (user_token),
        INDEX idx_pending_rumor (rumor_id)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS rate_limits (
        user_token VARCHAR(64) PRIMARY KEY,
        hourly_votes INT DEFAULT 0 NOT NULL,
        daily_votes INT DEFAULT 0 NOT NULL,
        last_vote_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        hour_reset_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        day_reset_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Database initialized successfully');
  } finally {
    connection.release();
  }
}

export { schema };
