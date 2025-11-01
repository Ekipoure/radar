const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://username:password@localhost:5432/radar_monitoring',
  ssl: process.env.DATABASE_URL?.includes('supabase.co') ? { rejectUnauthorized: false } : (process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false),
});

async function fixBannerSpeedConstraint() {
  const client = await pool.connect();
  
  try {
    await client.query("SET timezone = 'Asia/Tehran'");
    console.log('Starting migration to fix banner speed constraint...');
    
    console.log('Removing old constraint...');
    await client.query(`
      ALTER TABLE banners DROP CONSTRAINT IF EXISTS banners_speed_check;
    `);
    
    console.log('Adding new constraint (speed between 3 and 30)...');
    await client.query(`
      ALTER TABLE banners ADD CONSTRAINT banners_speed_check 
      CHECK (speed >= 3 AND speed <= 30);
    `);
    
    console.log('✓ Constraint updated successfully!');
    console.log('Speed can now be between 3 and 30 seconds.');
  } catch (error) {
    console.error('Error updating constraint:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixBannerSpeedConstraint()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });

