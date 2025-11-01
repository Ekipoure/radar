const { Pool } = require('pg');
require('dotenv').config();

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://username:password@localhost:5432/radar_monitoring',
  ssl: process.env.DATABASE_URL?.includes('supabase.co') ? { rejectUnauthorized: false } : (process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false),
});

async function addTimeoutCountColumn() {
  const client = await pool.connect();
  
  try {
    await client.query("SET timezone = 'Asia/Tehran'");
    console.log('Starting migration to add timeout_count column to servers table...');
    
    // Check if servers table exists
    const serversTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'servers'
      );
    `);
    
    if (!serversTableExists.rows[0].exists) {
      console.log('Servers table does not exist. Please run the application first to create the table.');
      return;
    }
    
    // Check if timeout_count column already exists
    const timeoutCountColumnExists = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'servers' AND column_name = 'timeout_count'
    `);
    
    if (timeoutCountColumnExists.rows.length > 0) {
      console.log('✓ timeout_count column already exists in servers table.');
      return;
    }
    
    console.log('Adding timeout_count column to servers table...');
    
    // Add timeout_count column
    await client.query(`
      ALTER TABLE servers 
      ADD COLUMN timeout_count INTEGER DEFAULT 3
    `);
    
    console.log('✓ timeout_count column added successfully.');
    
    // Update existing rows to have default value of 3 if NULL
    const updateResult = await client.query(`
      UPDATE servers 
      SET timeout_count = 3 
      WHERE timeout_count IS NULL
    `);
    console.log(`Updated ${updateResult.rowCount} existing records with default timeout_count value.`);
    
    // Make the column NOT NULL after setting defaults
    await client.query(`
      ALTER TABLE servers 
      ALTER COLUMN timeout_count SET NOT NULL
    `);
    
    console.log('✓ Column set as NOT NULL.');
    
    // Verify the column was added
    const verifyResult = await client.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'servers' AND column_name = 'timeout_count'
    `);
    
    if (verifyResult.rows.length > 0) {
      console.log('✓ Migration completed successfully!');
      console.log('Column details:', verifyResult.rows[0]);
    } else {
      console.log('✗ Error: Column was not created properly.');
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  addTimeoutCountColumn()
    .then(() => {
      console.log('Migration script completed.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { addTimeoutCountColumn };

