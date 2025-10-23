import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const client = await pool.connect();
    
    try {
      console.log('=== Debug monitoring data ===');
      
      // Check monitoring_data table
      const monitoringCount = await client.query('SELECT COUNT(*) as count FROM monitoring_data');
      console.log(`Total monitoring records: ${monitoringCount.rows[0].count}`);
      
      if (monitoringCount.rows[0].count > 0) {
        const sampleData = await client.query('SELECT * FROM monitoring_data ORDER BY checked_at DESC LIMIT 5');
        console.log('Sample monitoring data:');
        sampleData.rows.forEach(row => {
          console.log(`- ID: ${row.id}, Server: ${row.server_id}, Source: ${row.source_ip}, Status: ${row.status}, Time: ${row.checked_at}`);
        });
      }
      
      // Check agents
      const agents = await client.query('SELECT id, name, server_ip FROM agents WHERE is_active = true');
      console.log('Agents:');
      agents.rows.forEach(agent => {
        console.log(`- ${agent.name} (${agent.server_ip})`);
      });
      
      // Check servers
      const servers = await client.query('SELECT id, name, ip_address FROM servers WHERE is_active = true');
      console.log('Servers:');
      servers.rows.forEach(server => {
        console.log(`- ${server.name} (${server.ip_address})`);
      });
      
      // Test the join query
      const joinTest = await client.query(`
        SELECT 
          a.name as agent_name,
          a.server_ip,
          COUNT(md.id) as record_count
        FROM agents a
        LEFT JOIN monitoring_data md ON md.source_ip::text = a.server_ip::text
        WHERE a.is_active = true
        GROUP BY a.id, a.name, a.server_ip
        ORDER BY a.name
      `);
      
      console.log('Join test results:');
      joinTest.rows.forEach(row => {
        console.log(`- ${row.agent_name}: ${row.record_count} records`);
      });
      
      return NextResponse.json({
        monitoringCount: monitoringCount.rows[0].count,
        agents: agents.rows,
        servers: servers.rows,
        joinTest: joinTest.rows
      });
      
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json(
      { error: 'Debug error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
