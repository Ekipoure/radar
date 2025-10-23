import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const client = await pool.connect();
    
    try {
      console.log('=== Debug simple join ===');
      
      // Test simple join without GROUP BY
      const simpleJoin = await client.query(`
        SELECT 
          a.name as agent_name,
          a.server_ip::text as server_ip,
          md.source_ip,
          md.status,
          md.checked_at
        FROM agents a
        LEFT JOIN monitoring_data md ON md.source_ip::text = a.server_ip::text
        WHERE a.is_active = true
        ORDER BY a.name, md.checked_at DESC
        LIMIT 10
      `);
      
      console.log('Simple join results:');
      simpleJoin.rows.forEach(row => {
        console.log(`- ${row.agent_name} (${row.server_ip}): ${row.source_ip} - ${row.status} - ${row.checked_at}`);
      });
      
      // Test with GROUP BY
      const groupByJoin = await client.query(`
        SELECT 
          a.name as agent_name,
          a.server_ip::text as server_ip,
          COUNT(md.id) as record_count
        FROM agents a
        LEFT JOIN monitoring_data md ON md.source_ip::text = a.server_ip::text
        WHERE a.is_active = true
        GROUP BY a.id, a.name, a.server_ip
        ORDER BY a.name
      `);
      
      console.log('GROUP BY join results:');
      groupByJoin.rows.forEach(row => {
        console.log(`- ${row.agent_name} (${row.server_ip}): ${row.record_count} records`);
      });
      
      return NextResponse.json({
        simpleJoin: simpleJoin.rows,
        groupByJoin: groupByJoin.rows
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
