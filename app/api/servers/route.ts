import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';
import { CreateServerData, ServerWithStatus } from '@/lib/types';
import { verifyToken } from '@/lib/auth';
import { getMonitoringHistory, getServersWithAdvancedStatus } from '@/lib/monitoring';
import monitoringService from '@/lib/monitoring-service';

// Force dynamic rendering - prevent static optimization in production build
export const dynamic = 'force-dynamic';

function getAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return request.cookies.get('auth-token')?.value || null;
}

export async function GET(request: NextRequest) {
  try {
    const token = getAuthToken(request);
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use the new advanced status logic that requires ALL requests to fail
    const servers: ServerWithStatus[] = await getServersWithAdvancedStatus();
    return NextResponse.json({ servers });
  } catch (error) {
    console.error('Error fetching servers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getAuthToken(request);
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serverData: CreateServerData = await request.json();

    // Validate required fields
    if (!serverData.name || !serverData.ip_address || !serverData.request_type) {
      return NextResponse.json(
        { error: 'Name, IP address, and request type are required' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        INSERT INTO servers (name, ip_address, port, request_type, endpoint, expected_status_code, 
                           check_interval, timeout, timeout_count, server_group, color, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `, [
        serverData.name,
        serverData.ip_address,
        serverData.port || null,
        serverData.request_type,
        serverData.endpoint || null,
        serverData.expected_status_code || null,
        serverData.check_interval,
        serverData.timeout,
        serverData.timeout_count || 3,
        serverData.server_group,
        serverData.color || '#3B82F6',
        true
      ]);

      const newServer = result.rows[0];
      
      // Immediately check the new server to avoid "Unknown" status
      try {
        await monitoringService.checkServerImmediately(newServer.id);
      } catch (error) {
        console.error('Failed to check new server immediately:', error);
        // Don't fail the request if immediate check fails
      }

      return NextResponse.json({ server: newServer });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating server:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
