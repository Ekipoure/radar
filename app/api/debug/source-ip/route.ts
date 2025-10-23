import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const client = await pool.connect();
    
    try {
      console.log('=== Debug source_ip values ===');
      
      // Check source_ip values in monitoring_data
      const sourceIpValues = await client.query(`
        SELECT DISTINCT source_ip, COUNT(*) as count 
        FROM monitoring_data 
        WHERE source_ip IS NOT NULL 
        GROUP BY source_ip 
        ORDER BY count DESC
      `);
      
      console.log('Source IP values in monitoring_data:');
      sourceIpValues.rows.forEach(row => {
        console.log(`- ${row.source_ip}: ${row.count} records`);
      });
      
      // Check server_ip values in agents
      const agentIpValues = await client.query(`
        SELECT DISTINCT server_ip, COUNT(*) as count 
        FROM agents 
        WHERE is_active = true 
        GROUP BY server_ip 
        ORDER BY count DESC
      `);
      
      console.log('Server IP values in agents:');
      agentIpValues.rows.forEach(row => {
        console.log(`- ${row.server_ip}: ${row.count} agents`);
      });
      
      // Test exact match
      const exactMatch = await client.query(`
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
      
      console.log('Exact match results:');
      exactMatch.rows.forEach(row => {
        console.log(`- ${row.agent_name}: ${row.record_count} records`);
      });
      
      return NextResponse.json({
        sourceIpValues: sourceIpValues.rows,
        agentIpValues: agentIpValues.rows,
        exactMatch: exactMatch.rows
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
