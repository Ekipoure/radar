const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/radar_db',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function migrateToAgents() {
  const client = await pool.connect();
  
  try {
    console.log('Starting migration from deployed_servers to agents...');
    
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
    
    // Check if there are any deployed_servers to migrate
    const deployedServersCount = await client.query('SELECT COUNT(*) FROM deployed_servers');
    console.log(`Found ${deployedServersCount.rows[0].count} deployed servers to migrate.`);
    
    if (parseInt(deployedServersCount.rows[0].count) === 0) {
      console.log('No deployed servers to migrate.');
      return;
    }
    
    // Migrate data from deployed_servers to agents
    const result = await client.query(`
      INSERT INTO agents (name, server_ip, username, repo_url, status, deployed_at, last_checked, port, is_active, created_at, updated_at)
      SELECT 
        name,
        server_ip,
        username,
        repo_url,
        status,
        deployed_at,
        last_checked,
        port,
        is_active,
        created_at,
        updated_at
      FROM deployed_servers
      ON CONFLICT DO NOTHING
    `);
    
    console.log(`Successfully migrated ${result.rowCount} records to agents table.`);
    
    // Verify migration
    const agentsCount = await client.query('SELECT COUNT(*) FROM agents');
    console.log(`Agents table now contains ${agentsCount.rows[0].count} records.`);
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  migrateToAgents()
    .then(() => {
      console.log('Migration completed.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateToAgents };
