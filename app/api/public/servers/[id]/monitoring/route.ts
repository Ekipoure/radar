import { NextRequest, NextResponse } from 'next/server';
import { getMonitoringHistory, getMonitoringHistoryByDateRange } from '@/lib/monitoring';
import { getCachedData, generateCacheKey } from '@/lib/cache';
import pool from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const serverId = parseInt(params.id);
    const { searchParams } = new URL(request.url);
    const hours = parseFloat(searchParams.get('hours') || '6');
    
    // Date/time filter parameters
    const startDateTime = searchParams.get('start_datetime');
    const endDateTime = searchParams.get('end_datetime');

    if (isNaN(serverId)) {
      return NextResponse.json({ error: 'Invalid server ID' }, { status: 400 });
    }

    // Verify server exists and is active
    const client = await pool.connect();
    try {
      const serverResult = await client.query(
        'SELECT id FROM servers WHERE id = $1 AND is_active = true', 
        [serverId]
      );
      if (serverResult.rows.length === 0) {
        return NextResponse.json({ error: 'Server not found' }, { status: 404 });
      }
    } finally {
      client.release();
    }

    // Get monitoring data with appropriate filter
    let monitoringData;
    if (startDateTime && endDateTime) {
      // Use specific date/time range
      monitoringData = await getMonitoringHistoryByDateRange(serverId, startDateTime, endDateTime);
    } else {
      // Use hours-based range (default 6 hours)
      monitoringData = await getMonitoringHistory(serverId, hours);
    }

    return NextResponse.json(monitoringData);
  } catch (error) {
    console.error('Error fetching monitoring data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
