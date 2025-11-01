const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://radar_user:radar_password@localhost:5432/radar_monitoring',
  ssl: process.env.DATABASE_URL?.includes('supabase.co') ? { rejectUnauthorized: false } : (process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false),
});

async function clearMonitoringData() {
  const client = await pool.connect();
  
  try {
    // First, check how many records exist
    const countResult = await client.query('SELECT COUNT(*) as count FROM monitoring_data');
    const recordCount = parseInt(countResult.rows[0].count);
    console.log(`📊 Found ${recordCount} records in monitoring_data table`);
    
    if (recordCount === 0) {
      console.log('✅ Table is already empty');
      return;
    }
    
    // Clear the table
    console.log('🗑️  Clearing monitoring_data table...');
    await client.query('TRUNCATE TABLE monitoring_data RESTART IDENTITY');
    
    // Verify it's empty
    const verifyResult = await client.query('SELECT COUNT(*) as count FROM monitoring_data');
    const remainingCount = parseInt(verifyResult.rows[0].count);
    
    if (remainingCount === 0) {
      console.log(`✅ Successfully cleared ${recordCount} records from monitoring_data table`);
    } else {
      console.error(`❌ Error: ${remainingCount} records still exist`);
    }
    
  } catch (error) {
    console.error('❌ Error clearing monitoring_data table:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

clearMonitoringData()
  .then(() => {
    console.log('✅ Done');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });

