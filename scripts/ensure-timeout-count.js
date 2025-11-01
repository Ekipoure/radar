const { Pool } = require('pg');
require('dotenv').config();

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://username:password@localhost:5432/radar_monitoring',
  ssl: process.env.DATABASE_URL?.includes('supabase.co') ? { rejectUnauthorized: false } : (process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false),
});

async function ensureTimeoutCount() {
  const client = await pool.connect();
  
  try {
    await client.query("SET timezone = 'Asia/Tehran'");
    console.log('Checking and ensuring timeout_count column exists...');
    
    // Check if servers table exists
    const serversTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'servers'
      );
    `);
    
    if (!serversTableExists.rows[0].exists) {
      console.log('✗ Servers table does not exist.');
      return;
    }
    
    // Check if timeout_count column exists
    const columnCheck = await client.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'servers' AND column_name = 'timeout_count'
    `);
    
    if (columnCheck.rows.length === 0) {
      console.log('Adding timeout_count column...');
      // Add timeout_count column
      await client.query(`
        ALTER TABLE servers 
        ADD COLUMN timeout_count INTEGER DEFAULT 3
      `);
      console.log('✓ timeout_count column added.');
    } else {
      console.log('✓ timeout_count column exists.');
      console.log('Column info:', columnCheck.rows[0]);
    }
    
    // Update all rows that have NULL timeout_count
    const updateResult = await client.query(`
      UPDATE servers 
      SET timeout_count = 3 
      WHERE timeout_count IS NULL
    `);
    console.log(`✓ Updated ${updateResult.rowCount} rows with NULL timeout_count.`);
    
    // Try to set NOT NULL constraint (might fail if some are still NULL, that's ok)
    try {
      await client.query(`
        ALTER TABLE servers 
        ALTER COLUMN timeout_count SET NOT NULL
      `);
      console.log('✓ Column set as NOT NULL.');
    } catch (error) {
      console.log('Note: Could not set NOT NULL constraint (some rows might still be NULL)');
    }
    
    // Verify - check all servers
    const verifyResult = await client.query(`
      SELECT id, name, timeout_count
      FROM servers
      ORDER BY id
    `);
    
    console.log('\n=== All Servers ===');
    verifyResult.rows.forEach(server => {
      console.log(`- ID: ${server.id}, Name: ${server.name}, timeout_count: ${server.timeout_count}`);
    });
    
    // Final verification
    const finalCheck = await client.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'servers' AND column_name = 'timeout_count'
    `);
    
    if (finalCheck.rows.length > 0) {
      console.log('\n✓ Migration completed successfully!');
      console.log('Final column details:', finalCheck.rows[0]);
    } else {
      console.log('\n✗ Error: Column verification failed.');
    }
    
  } catch (error) {
    console.error('✗ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run if executed directly
if (require.main === module) {
  ensureTimeoutCount()
    .then(() => {
      console.log('\n✓ Script completed.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n✗ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { ensureTimeoutCount };

