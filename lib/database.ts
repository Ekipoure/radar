import { Pool } from 'pg';
import { config } from 'dotenv';

// Load environment variables
config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://username:password@localhost:5432/radar_monitoring',
  ssl: process.env.DATABASE_URL?.includes('supabase.co') ? { rejectUnauthorized: false } : (process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false),
});

// Ensure timezone is set for all connections
pool.on('connect', async (client) => {
  try {
    await client.query("SET timezone = 'Asia/Tehran'");
  } catch (error) {
    console.error('Failed to set timezone:', error);
  }
});

export default pool;

// Database initialization
export async function initializeDatabase() {
  const client = await pool.connect();
  
  try {
    // Set timezone to Iran/Tehran for this session
    await client.query("SET timezone = 'Asia/Tehran'");
    
    // Log environment info for debugging
    console.log('📊 Initializing database...', {
      nodeEnv: process.env.NODE_ENV,
      nextPhase: process.env.NEXT_PHASE,
      isBuild: process.argv.includes('build')
    });
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

    // Create monitoring_data table for historical data FIRST
    // Check if table already exists to avoid recreating constraints
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'monitoring_data'
      )
    `);

    let recordCountBefore = 0;
    if (tableExists.rows[0].exists) {
      // Table exists, count records before any operations
      const countResult = await client.query('SELECT COUNT(*) as count FROM monitoring_data');
      recordCountBefore = parseInt(countResult.rows[0].count);
      console.log(`⚠️  monitoring_data table exists with ${recordCountBefore} records - will preserve all data`);
    }

    if (!tableExists.rows[0].exists) {
      // Table doesn't exist, create it
      await client.query(`
        CREATE TABLE monitoring_data (
          id SERIAL PRIMARY KEY,
          server_id INTEGER REFERENCES servers(id) ON DELETE CASCADE,
          source_ip VARCHAR(45),
          status VARCHAR(20) NOT NULL,
          response_time INTEGER,
          error_message TEXT,
          checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Created monitoring_data table');
    } else {
      // Table exists, only add missing columns if needed
      console.log('✅ monitoring_data table already exists, checking for missing columns...');
    }

    // Add source_ip column to existing monitoring_data table if it doesn't exist
    // This must run AFTER the table exists (either created above or already existed)
    try {
      // Check if column exists first
      const columnExists = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'monitoring_data' 
        AND column_name = 'source_ip'
      `);

      if (columnExists.rows.length === 0) {
        await client.query(`
          ALTER TABLE monitoring_data 
          ADD COLUMN source_ip VARCHAR(45)
        `);
        console.log('Added source_ip column to monitoring_data table');
      }
    } catch (error) {
      // Column might already exist or other error
      console.log('Warning: Could not add source_ip column to monitoring_data:', error instanceof Error ? error.message : 'Unknown error');
    }

    // Add constraint to monitoring_data table
    try {
      // First check if constraint already exists
      const constraintExists = await client.query(`
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'monitoring_data_status_check' 
        AND table_name = 'monitoring_data'
      `);
      
      if (constraintExists.rows.length === 0) {
        await client.query(`
          ALTER TABLE monitoring_data 
          ADD CONSTRAINT monitoring_data_status_check 
          CHECK (status IN ('up', 'down', 'timeout', 'error', 'skipped'))
        `);
      }
    } catch (error) {
      console.log('Warning: Could not add monitoring_data constraint:', error instanceof Error ? error.message : 'Unknown error');
    }

    // Create optimized indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_monitoring_data_server_id 
      ON monitoring_data(server_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_monitoring_data_checked_at 
      ON monitoring_data(checked_at)
    `);

    // Composite index for better query performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_monitoring_data_server_checked 
      ON monitoring_data(server_id, checked_at DESC)
    `);

    // Index for source_ip queries (exact match)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_monitoring_data_source_ip 
      ON monitoring_data(source_ip)
    `);

    // Composite index for source_ip and checked_at (most important for performance)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_monitoring_data_source_checked 
      ON monitoring_data(source_ip, checked_at DESC)
    `);

    // Additional index for time-based queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_monitoring_data_checked_at_desc 
      ON monitoring_data(checked_at DESC)
    `);

    // Index for status queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_monitoring_data_status 
      ON monitoring_data(status)
    `);

    // Create agents table (renamed from deployed_servers)
    await client.query(`
      CREATE TABLE IF NOT EXISTS agents (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        server_ip VARCHAR(45) NOT NULL,
        username VARCHAR(100) NOT NULL,
        repo_url VARCHAR(500) NOT NULL,
        location VARCHAR(20) NOT NULL DEFAULT 'internal' CHECK (location IN ('internal', 'external')),
        status VARCHAR(20) NOT NULL DEFAULT 'deployed' CHECK (status IN ('deployed', 'deploying', 'failed', 'stopped')),
        deployed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_checked TIMESTAMP,
        port INTEGER DEFAULT 3000,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add location column to existing agents table if it doesn't exist
    // First check if location column exists
    const locationColumnExists = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'agents' AND column_name = 'location'
    `);

    if (locationColumnExists.rows.length === 0) {
      // Check if location_type column exists (old column name)
      const locationTypeColumnExists = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'agents' AND column_name = 'location_type'
      `);

      // Add location column
      await client.query(`
        ALTER TABLE agents 
        ADD COLUMN location VARCHAR(20) DEFAULT 'internal'
      `);

      // If location_type exists, copy data from it to location
      if (locationTypeColumnExists.rows.length > 0) {
        await client.query(`
          UPDATE agents 
          SET location = location_type 
          WHERE location = 'internal' AND location_type IS NOT NULL
        `);
      }

      // Add constraint to location column if it doesn't exist
      try {
        const constraintExists = await client.query(`
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'agents_location_check' 
          AND table_name = 'agents'
        `);
        
        if (constraintExists.rows.length === 0) {
          await client.query(`
            ALTER TABLE agents 
            ADD CONSTRAINT agents_location_check 
            CHECK (location IN ('internal', 'external'))
          `);
        }
      } catch (error) {
        console.log('Warning: Could not add location constraint:', error instanceof Error ? error.message : 'Unknown error');
      }
    } else {
      // Location column exists, but check if constraint exists
      try {
        const constraintExists = await client.query(`
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'agents_location_check' 
          AND table_name = 'agents'
        `);
        
        if (constraintExists.rows.length === 0) {
          await client.query(`
            ALTER TABLE agents 
            ADD CONSTRAINT agents_location_check 
            CHECK (location IN ('internal', 'external'))
          `);
        }
      } catch (error) {
        console.log('Warning: Could not add location constraint:', error instanceof Error ? error.message : 'Unknown error');
      }
    }

    // Create deployed_servers table (keeping for backward compatibility)
    await client.query(`
      CREATE TABLE IF NOT EXISTS deployed_servers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        server_ip VARCHAR(45) NOT NULL,
        username VARCHAR(100) NOT NULL,
        repo_url VARCHAR(500) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'deployed' CHECK (status IN ('deployed', 'deploying', 'failed', 'stopped')),
        deployed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_checked TIMESTAMP,
        port INTEGER DEFAULT 3000,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for agents table (with error handling)
    try {
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_agents_status 
        ON agents(status)
      `);
    } catch (error) {
      console.log('Index idx_agents_status might already exist or table not ready');
    }

    try {
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_agents_is_active 
        ON agents(is_active)
      `);
    } catch (error) {
      console.log('Index idx_agents_is_active might already exist or table not ready');
    }

    try {
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_agents_deployed_at 
        ON agents(deployed_at)
      `);
    } catch (error) {
      console.log('Index idx_agents_deployed_at might already exist or table not ready');
    }

    // Create indexes for deployed_servers (with error handling)
    try {
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_deployed_servers_status 
        ON deployed_servers(status)
      `);
    } catch (error) {
      console.log('Index idx_deployed_servers_status might already exist or table not ready');
    }

    try {
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_deployed_servers_deployed_at 
        ON deployed_servers(deployed_at)
      `);
    } catch (error) {
      console.log('Index idx_deployed_servers_deployed_at might already exist or table not ready');
    }

    // Create ads table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ads (
        id SERIAL PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        image_url VARCHAR(500) NOT NULL,
        link_url VARCHAR(500) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create index for ads table
    try {
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_ads_is_active 
        ON ads(is_active)
      `);
    } catch (error) {
      console.log('Index idx_ads_is_active might already exist or table not ready');
    }

    // Create banners table
    await client.query(`
      CREATE TABLE IF NOT EXISTS banners (
        id SERIAL PRIMARY KEY,
        text TEXT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        speed INTEGER DEFAULT 10,
        color VARCHAR(7) DEFAULT '#FFFFFF',
        background_color VARCHAR(7) DEFAULT '#3B82F6',
        font_size INTEGER DEFAULT 24,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add font_size column to existing banners table if it doesn't exist
    await client.query(`
      ALTER TABLE banners 
      ADD COLUMN IF NOT EXISTS font_size INTEGER DEFAULT 24
    `);

    // Create index for banners table
    try {
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_banners_is_active 
        ON banners(is_active)
      `);
    } catch (error) {
      console.log('Index idx_banners_is_active might already exist or table not ready');
    }

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

    // Verify data integrity after initialization
    if (tableExists.rows[0].exists && recordCountBefore > 0) {
      const countResultAfter = await client.query('SELECT COUNT(*) as count FROM monitoring_data');
      const recordCountAfter = parseInt(countResultAfter.rows[0].count);
      
      if (recordCountAfter !== recordCountBefore) {
        console.error(`❌ CRITICAL: Record count changed from ${recordCountBefore} to ${recordCountAfter}! Data may have been lost!`);
      } else {
        console.log(`✅ Data integrity verified: ${recordCountAfter} records preserved`);
      }
    }

    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    client.release();
  }
}
