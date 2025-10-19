import { Pool } from 'pg';
import { config } from 'dotenv';

// Load environment variables
config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://username:password@localhost:5432/radar_monitoring',
  ssl: process.env.DATABASE_URL?.includes('supabase.co') ? { rejectUnauthorized: false } : (process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false),
});

export default pool;

// Database initialization
export async function initializeDatabase() {
  const client = await pool.connect();
  
  try {
    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create servers table
    await client.query(`
      CREATE TABLE IF NOT EXISTS servers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        ip_address VARCHAR(45) NOT NULL,
        port INTEGER,
        request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('ping', 'http', 'https', 'tcp')),
        endpoint VARCHAR(255),
        expected_status_code INTEGER,
        check_interval INTEGER NOT NULL DEFAULT 60,
        timeout INTEGER NOT NULL DEFAULT 5000,
        server_group VARCHAR(20) NOT NULL CHECK (server_group IN ('iranian', 'global')),
        color VARCHAR(7) DEFAULT '#3B82F6',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add color column to existing servers table if it doesn't exist
    await client.query(`
      ALTER TABLE servers 
      ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#3B82F6'
    `);

    // Create monitoring_data table for historical data
    await client.query(`
      CREATE TABLE IF NOT EXISTS monitoring_data (
        id SERIAL PRIMARY KEY,
        server_id INTEGER REFERENCES servers(id) ON DELETE CASCADE,
        status VARCHAR(20) NOT NULL CHECK (status IN ('up', 'down', 'timeout', 'error', 'skipped')),
        response_time INTEGER,
        error_message TEXT,
        checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Update existing constraint to include 'skipped' status
    await client.query(`
      ALTER TABLE monitoring_data 
      DROP CONSTRAINT IF EXISTS monitoring_data_status_check
    `);
    
    await client.query(`
      ALTER TABLE monitoring_data 
      ADD CONSTRAINT monitoring_data_status_check 
      CHECK (status IN ('up', 'down', 'timeout', 'error', 'skipped'))
    `);

    // Create index for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_monitoring_data_server_id 
      ON monitoring_data(server_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_monitoring_data_checked_at 
      ON monitoring_data(checked_at)
    `);

    // Insert default admin user if not exists
    const adminExists = await client.query('SELECT id FROM users WHERE username = $1', ['admin']);
    if (adminExists.rows.length === 0) {
      // Default password is 'admin123' - change this in production!
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await client.query(
        'INSERT INTO users (username, password_hash) VALUES ($1, $2)',
        ['admin', hashedPassword]
      );
    }

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    client.release();
  }
}
