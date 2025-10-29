const { Pool } = require('pg');
require('dotenv').config();

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://username:password@localhost:5432/radar_monitoring',
  ssl: process.env.DATABASE_URL?.includes('supabase.co') ? { rejectUnauthorized: false } : (process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false),
});

async function addLocationColumn() {
  const client = await pool.connect();
  
  try {
    await client.query("SET timezone = 'Asia/Tehran'");
    console.log('Starting migration to add location column to agents table...');
    
    // Check if agents table exists
    const agentsTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'agents'
      );
    `);
    
    if (!agentsTableExists.rows[0].exists) {
      console.log('Agents table does not exist. Please run the application first to create the table.');
      return;
    }
    
    // Check if location column already exists
    const locationColumnExists = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'agents' AND column_name = 'location'
    `);
    
    if (locationColumnExists.rows.length > 0) {
      console.log('Location column already exists in agents table.');
      return;
    }
    
    // Check if location_type column exists (old column name)
    const locationTypeColumnExists = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'agents' AND column_name = 'location_type'
    `);
    
    console.log('Adding location column to agents table...');
    
    // Add location column
    await client.query(`
      ALTER TABLE agents 
      ADD COLUMN location VARCHAR(20) DEFAULT 'internal'
    `);
    
    console.log('Location column added successfully.');
    
    // If location_type exists, copy data from it to location
    if (locationTypeColumnExists.rows.length > 0) {
      console.log('Copying data from location_type to location...');
      const updateResult = await client.query(`
        UPDATE agents 
        SET location = location_type 
        WHERE location = 'internal' AND location_type IS NOT NULL
      `);
      console.log(`Updated ${updateResult.rowCount} records with location_type values.`);
    }
    
    // Add constraint to location column
    console.log('Adding constraint to location column...');
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
        console.log('Constraint added successfully.');
      } else {
        console.log('Constraint already exists.');
      }
    } catch (error) {
      console.error('Warning: Could not add location constraint:', error.message);
    }
    
    // Verify the column was added
    const verifyResult = await client.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'agents' AND column_name = 'location'
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
  addLocationColumn()
    .then(() => {
      console.log('Migration script completed.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { addLocationColumn };

