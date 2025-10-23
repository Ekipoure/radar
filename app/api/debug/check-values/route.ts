import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const client = await pool.connect();
    
    try {
      console.log('=== Check exact values ===');
      
      // Get exact values from monitoring_data
      const monitoringValues = await client.query(`
        SELECT DISTINCT source_ip, LENGTH(source_ip::text) as length
        FROM monitoring_data 
        WHERE source_ip IS NOT NULL
        ORDER BY source_ip
        LIMIT 10
      `);
      
      console.log('Monitoring data source_ip values:');
      monitoringValues.rows.forEach(row => {
        console.log(`- "${row.source_ip}" (length: ${row.length})`);
      });
      
      // Get exact values from agents
      const agentValues = await client.query(`
        SELECT DISTINCT server_ip::text as server_ip, LENGTH(server_ip::text) as length
        FROM agents 
        WHERE is_active = true
        ORDER BY server_ip
      `);
      
      console.log('Agents server_ip values:');
      agentValues.rows.forEach(row => {
        console.log(`- "${row.server_ip}" (length: ${row.length})`);
      });
      
      // Test with specific values
      const test1 = await client.query(`
        SELECT COUNT(*) as count
        FROM monitoring_data 
        WHERE source_ip = '45.61.173.97'
      `);
      
      const test2 = await client.query(`
        SELECT COUNT(*) as count
        FROM monitoring_data 
        WHERE source_ip::text = '45.61.173.97'
      `);
      
      console.log(`Direct match '45.61.173.97': ${test1.rows[0].count}`);
      console.log(`Text cast match '45.61.173.97': ${test2.rows[0].count}`);
      
      return NextResponse.json({
        monitoringValues: monitoringValues.rows,
        agentValues: agentValues.rows,
        test1: test1.rows[0].count,
        test2: test2.rows[0].count
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
