import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';
import { ServerWithStatus } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        SELECT s.*, 
               md.status as current_status,
               md.checked_at as last_checked,
               md.response_time,
               md.error_message
        FROM servers s
        LEFT JOIN LATERAL (
          SELECT status, checked_at, response_time, error_message
          FROM monitoring_data
          WHERE server_id = s.id
          ORDER BY checked_at DESC
          LIMIT 1
        ) md ON true
        WHERE s.is_active = true
        ORDER BY s.created_at DESC
      `);

      const servers: ServerWithStatus[] = result.rows;
      return NextResponse.json({ servers });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching servers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
