import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { getMonitoringHistory } from '@/lib/monitoring';
import pool from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authError = requireAuth(request);
    if (authError) {
      return authError;
    }
    const serverId = parseInt(params.id);
    const { searchParams } = new URL(request.url);
    const hours = parseFloat(searchParams.get('hours') || '6');

    if (isNaN(serverId)) {
      return NextResponse.json({ error: 'Invalid server ID' }, { status: 400 });
    }

    // Verify server exists
    const client = await pool.connect();
    try {
      const serverResult = await client.query('SELECT id FROM servers WHERE id = $1', [serverId]);
      if (serverResult.rows.length === 0) {
        return NextResponse.json({ error: 'Server not found' }, { status: 404 });
      }
    } finally {
      client.release();
    }

    // Get monitoring data
    const monitoringData = await getMonitoringHistory(serverId, hours);

    return NextResponse.json(monitoringData);
  } catch (error) {
    console.error('Error fetching monitoring data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
