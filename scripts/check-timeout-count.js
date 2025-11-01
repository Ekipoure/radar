const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://username:password@localhost:5432/radar_monitoring',
  ssl: process.env.DATABASE_URL?.includes('supabase.co') ? { rejectUnauthorized: false } : (process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false),
});

async function checkTimeoutCount() {
  const client = await pool.connect();
  
  try {
    await client.query("SET timezone = 'Asia/Tehran'");
    
    // Check all columns in servers table
    const columns = await client.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'servers'
      ORDER BY ordinal_position
    `);
    
    console.log('=== All columns in servers table ===');
    columns.rows.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type} (default: ${col.column_default}, nullable: ${col.is_nullable})`);
    });
    
    // Check if timeout_count is in the list
    const timeoutCountExists = columns.rows.find(col => col.column_name === 'timeout_count');
    
    if (timeoutCountExists) {
      console.log('\n✓ timeout_count column EXISTS');
      console.log('Details:', timeoutCountExists);
    } else {
      console.log('\n✗ timeout_count column DOES NOT EXIST');
    }
    
    // Try to select it
    console.log('\n=== Testing SELECT with timeout_count ===');
    const testQuery = await client.query(`
      SELECT id, name, timeout_count 
      FROM servers 
      LIMIT 3
    `);
    
    console.log('Sample data:');
    testQuery.rows.forEach(row => {
      console.log(`- ID: ${row.id}, Name: ${row.name}, timeout_count: ${row.timeout_count}`);
    });
    
    // Test SELECT s.*
    console.log('\n=== Testing SELECT s.* ===');
    const testStar = await client.query(`
      SELECT s.*
      FROM servers s
      LIMIT 1
    `);
    
    if (testStar.rows.length > 0) {
      const firstRow = testStar.rows[0];
      console.log('Columns returned by SELECT s.*:');
      console.log(Object.keys(firstRow));
      console.log('Has timeout_count?', firstRow.hasOwnProperty('timeout_count'));
      console.log('timeout_count value:', firstRow.timeout_count);
    }
    
  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

checkTimeoutCount()
  .then(() => {
    console.log('\n✓ Check completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Check failed:', error);
    process.exit(1);
  });

