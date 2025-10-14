import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';
import { DashboardStats } from '@/lib/types';
import { verifyToken } from '@/lib/auth';

function getAuthToken(request: NextRequest): string | null {
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

      // Get current status counts
      const statusResult = await client.query(`
        SELECT 
          COALESCE(md.status, 'unknown') as status,
          COUNT(*) as count
        FROM servers s
        LEFT JOIN LATERAL (
          SELECT status
          FROM monitoring_data
          WHERE server_id = s.id
          ORDER BY checked_at DESC
          LIMIT 1
        ) md ON true
        WHERE s.is_active = true
        GROUP BY md.status
      `);

      const upServers = statusResult.rows.find(r => r.status === 'up')?.count || 0;
      const downServers = statusResult.rows
        .filter(r => ['down', 'timeout', 'error'].includes(r.status))
        .reduce((sum, r) => sum + parseInt(r.count), 0);

      const stats: DashboardStats = {
        total_servers: totalServers,
        up_servers: parseInt(upServers),
        down_servers: downServers,
        iranian_servers: parseInt(iranianServers),
        global_servers: parseInt(globalServers)
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
