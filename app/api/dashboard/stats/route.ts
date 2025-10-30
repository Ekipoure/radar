import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';
import { DashboardStats } from '@/lib/types';
import { verifyToken } from '@/lib/auth';
import { getServersWithAdvancedStatus } from '@/lib/monitoring';

// Force dynamic rendering
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

    const client = await pool.connect();
    
    try {
      // Get total servers count
      const totalResult = await client.query('SELECT COUNT(*) as count FROM servers');
      const totalServers = parseInt(totalResult.rows[0].count);

      // Get servers by group
      const groupResult = await client.query(`
        SELECT server_group, COUNT(*) as count 
        FROM servers 
        GROUP BY server_group
      `);
      
      const iranianServers = groupResult.rows.find(r => r.server_group === 'iranian')?.count || 0;
      const globalServers = groupResult.rows.find(r => r.server_group === 'global')?.count || 0;

      // Get current status counts using new advanced logic
      const servers = await getServersWithAdvancedStatus();
      const upServers = servers.filter(s => s.current_status === 'active').length;
      const downServers = servers.filter(s => s.current_status === 'inactive').length;

      // Get total agents count
      const agentsResult = await client.query('SELECT COUNT(*) as count FROM agents WHERE is_active = true');
      const totalAgents = parseInt(agentsResult.rows[0].count);

      // Get monitoring data from last 6 hours
      const monitoringResult = await client.query(`
        SELECT 
          COUNT(*) as total_checks,
          COUNT(CASE WHEN status = 'up' THEN 1 END) as up_count,
          COUNT(CASE WHEN status = 'down' THEN 1 END) as down_count,
          COUNT(CASE WHEN status = 'timeout' THEN 1 END) as timeout_count,
          COUNT(CASE WHEN status = 'error' THEN 1 END) as error_count
        FROM monitoring_data 
        WHERE checked_at >= NOW() - INTERVAL '6 hours'
      `);

      const monitoring = monitoringResult.rows[0];
      const totalChecks = parseInt(monitoring.total_checks);
      const upCount = parseInt(monitoring.up_count);
      const downCount = parseInt(monitoring.down_count);
      const timeoutCount = parseInt(monitoring.timeout_count);
      const errorCount = parseInt(monitoring.error_count);

      const uptimePercentage = totalChecks > 0 ? Math.round((upCount / totalChecks) * 100) : 0;

      const stats: DashboardStats = {
        totalServers: totalServers,
        totalAgents: totalAgents,
        totalChecks: totalChecks,
        upCount: upCount,
        downCount: downCount,
        timeoutCount: timeoutCount,
        errorCount: errorCount,
        uptimePercentage: uptimePercentage
      };

      return NextResponse.json({ stats });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
