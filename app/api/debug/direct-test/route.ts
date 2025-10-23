import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const client = await pool.connect();
    
    try {
      console.log('=== Direct test ===');
      
      // Test exact string match
      const exactMatch = await client.query(`
        SELECT 
          a.name as agent_name,
          a.server_ip::text as agent_ip,
          md.source_ip as monitoring_ip,
          md.status,
          md.checked_at
        FROM agents a
        CROSS JOIN monitoring_data md
        WHERE a.is_active = true 
          AND md.source_ip::text = a.server_ip::text
        ORDER BY a.name, md.checked_at DESC
        LIMIT 5
      `);
      
      console.log('Exact match results:');
      exactMatch.rows.forEach(row => {
        console.log(`- ${row.agent_name}: ${row.agent_ip} = ${row.monitoring_ip} - ${row.status}`);
      });
      
      // Test with specific IP
      const specificTest = await client.query(`
        SELECT 
          a.name as agent_name,
          a.server_ip::text as agent_ip,
          COUNT(md.id) as record_count
        FROM agents a
        LEFT JOIN monitoring_data md ON md.source_ip::text = a.server_ip::text
        WHERE a.is_active = true 
          AND a.server_ip::text = '45.61.173.97'
        GROUP BY a.id, a.name, a.server_ip
      `);
      
      console.log('Specific IP test:');
      specificTest.rows.forEach(row => {
        console.log(`- ${row.agent_name}: ${row.record_count} records`);
      });
      
      // Check if there are any matches at all
      const anyMatch = await client.query(`
        SELECT 
          a.server_ip::text as agent_ip,
          md.source_ip as monitoring_ip,
          COUNT(*) as count
        FROM agents a
        CROSS JOIN monitoring_data md
        WHERE a.is_active = true
        GROUP BY a.server_ip::text, md.source_ip
        HAVING a.server_ip::text = md.source_ip::text
        ORDER BY count DESC
        LIMIT 10
      `);
      
      console.log('Any match results:');
      anyMatch.rows.forEach(row => {
        console.log(`- ${row.agent_ip} = ${row.monitoring_ip}: ${row.count} records`);
      });
      
      return NextResponse.json({
        exactMatch: exactMatch.rows,
        specificTest: specificTest.rows,
        anyMatch: anyMatch.rows
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
