const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://username:password@localhost:5432/radar_monitoring',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function addTestData() {
  const client = await pool.connect();
  
  try {
    console.log('Adding test data...');

    // Check if servers already exist
    const existingServers = await client.query('SELECT COUNT(*) as count FROM servers');
    if (parseInt(existingServers.rows[0].count) > 0) {
      console.log('Servers already exist, skipping server creation');
    } else {
      // Add test servers
      const servers = [
        {
          name: 'Google DNS',
          ip_address: '8.8.8.8',
          port: 53,
          request_type: 'ping',
          check_interval: 30,
          timeout: 5000,
          server_group: 'global',
          color: '#3B82F6'
        },
        {
          name: 'Cloudflare DNS',
          ip_address: '1.1.1.1',
          port: 53,
          request_type: 'ping',
          check_interval: 30,
          timeout: 5000,
          server_group: 'global',
          color: '#F59E0B'
        },
        {
          name: 'Google.com',
          ip_address: '142.250.191.14',
          port: 443,
          request_type: 'https',
          endpoint: 'https://google.com',
          expected_status_code: 200,
          check_interval: 60,
          timeout: 10000,
          server_group: 'global',
          color: '#10B981'
        },
        {
          name: 'Test Iranian Server',
          ip_address: '185.143.233.1',
          port: 80,
          request_type: 'http',
          endpoint: 'http://185.143.233.1',
          expected_status_code: 200,
          check_interval: 45,
          timeout: 8000,
          server_group: 'iranian',
          color: '#EF4444'
        }
      ];

      for (const server of servers) {
        await client.query(`
          INSERT INTO servers (name, ip_address, port, request_type, endpoint, expected_status_code, check_interval, timeout, server_group, color)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          server.name,
          server.ip_address,
          server.port,
          server.request_type,
          server.endpoint,
          server.expected_status_code,
          server.check_interval,
          server.timeout,
          server.server_group,
          server.color
        ]);
        console.log(`Added server: ${server.name}`);
      }
    }

    // Get server IDs
    const serverResult = await client.query('SELECT id, name FROM servers ORDER BY id');
    const servers = serverResult.rows;
    
    console.log(`Found ${servers.length} servers`);

    // Add some historical monitoring data for the last 6 hours
    const now = new Date();
    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
    
    for (const server of servers) {
      console.log(`Adding monitoring data for ${server.name}...`);
      
      // Generate data points every 5 minutes for the last 6 hours
      const dataPoints = [];
      for (let i = 0; i < 72; i++) { // 6 hours * 12 (every 5 minutes)
        const checkTime = new Date(sixHoursAgo.getTime() + i * 5 * 60 * 1000);
        
        // Simulate realistic monitoring data
        const statuses = ['up', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'down']; // 90% up, 10% down
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        
        const responseTime = status === 'up' 
          ? Math.floor(Math.random() * 200) + 50 // 50-250ms
          : null;
        
        const errorMessage = status === 'down' 
          ? 'Connection timeout' 
          : null;
        
        dataPoints.push([
          server.id,
          status,
          responseTime,
          errorMessage,
          checkTime
        ]);
      }
      
      // Insert monitoring data
      for (const [serverId, status, responseTime, errorMessage, checkedAt] of dataPoints) {
        await client.query(`
          INSERT INTO monitoring_data (server_id, status, response_time, error_message, checked_at)
          VALUES ($1, $2, $3, $4, $5)
        `, [serverId, status, responseTime, errorMessage, checkedAt]);
      }
      
      console.log(`Added ${dataPoints.length} monitoring records for ${server.name}`);
    }

    console.log('✅ Test data added successfully!');
    
    // Show summary
    const summaryResult = await client.query(`
      SELECT 
        s.name,
        COUNT(md.id) as record_count,
        MAX(md.checked_at) as last_check
      FROM servers s
      LEFT JOIN monitoring_data md ON s.id = md.server_id
      GROUP BY s.id, s.name
      ORDER BY s.id
    `);
    
    console.log('\n📊 Summary:');
    summaryResult.rows.forEach(row => {
      console.log(`- ${row.name}: ${row.record_count} records, last check: ${row.last_check}`);
    });

  } catch (error) {
    console.error('Error adding test data:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

addTestData();



