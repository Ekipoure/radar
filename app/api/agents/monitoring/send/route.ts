import { NextRequest, NextResponse } from 'next/server';
import { saveMonitoringData } from '@/lib/monitoring';
import pool from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { server_id, source_ip, status, response_time, error_message } = body;

    // Validate required fields
    if (!server_id || !source_ip || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: server_id, source_ip, status' },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ['up', 'down', 'timeout', 'error', 'skipped'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') },
        { status: 400 }
      );
    }

    // Verify server exists
    const client = await pool.connect();
    try {
      const serverResult = await client.query(
        'SELECT id FROM servers WHERE id = $1 AND is_active = true',
        [server_id]
      );
      
      if (serverResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Server not found or not active' },
          { status: 404 }
        );
      }
    } finally {
      client.release();
    }

    // Save monitoring data
    await saveMonitoringData(server_id, {
      status,
      response_time,
      error_message
    }, source_ip);

    return NextResponse.json({ 
      success: true, 
      message: 'Monitoring data saved successfully' 
    });

  } catch (error) {
    console.error('Error saving agent monitoring data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
