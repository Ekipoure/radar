const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://radar_user:radar_password@localhost:5432/radar_monitoring',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function checkDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('=== Checking Servers ===');
    const serversResult = await client.query('SELECT id, name, ip_address, is_active FROM servers ORDER BY id');
    console.log(`Found ${serversResult.rows.length} servers:`);
    serversResult.rows.forEach(server => {
      console.log(`- ID: ${server.id}, Name: ${server.name}, IP: ${server.ip_address}, Active: ${server.is_active}`);
    });

    console.log('\n=== Checking Monitoring Data ===');
    const monitoringResult = await client.query(`
      SELECT 
        md.id, 
        md.server_id, 
        s.name as server_name,
        md.status, 
        md.response_time, 
        md.checked_at,
        md.error_message
      FROM monitoring_data md
      JOIN servers s ON md.server_id = s.id
      ORDER BY md.checked_at DESC
      LIMIT 20
    `);
    console.log(`Found ${monitoringResult.rows.length} monitoring records:`);
    monitoringResult.rows.forEach(record => {
      console.log(`- Server: ${record.server_name} (ID: ${record.server_id}), Status: ${record.status}, Response Time: ${record.response_time}ms, Time: ${record.checked_at}`);
    });

    console.log('\n=== Monitoring Data Count by Server ===');
    const countResult = await client.query(`
      SELECT 
        s.id,
        s.name,
        COUNT(md.id) as record_count,
        MAX(md.checked_at) as last_check
      FROM servers s
      LEFT JOIN monitoring_data md ON s.id = md.server_id
      WHERE s.is_active = true
      GROUP BY s.id, s.name
      ORDER BY s.id
    `);
    countResult.rows.forEach(server => {
      console.log(`- ${server.name} (ID: ${server.id}): ${server.record_count} records, last check: ${server.last_check || 'never'}`);
    });

  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkDatabase();
