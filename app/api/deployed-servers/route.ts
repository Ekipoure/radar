import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';
import { DeployedServer, CreateDeployedServerData, UpdateDeployedServerData } from '@/lib/types';
import { requireAuth } from '@/lib/auth-middleware';

export async function GET(request: NextRequest) {
  try {
    const authError = requireAuth(request);
    if (authError) {
      return authError;
    }

    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        SELECT * FROM deployed_servers
        ORDER BY created_at DESC
      `);

      const deployedServers: DeployedServer[] = result.rows;
      return NextResponse.json({ deployedServers });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching deployed servers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authError = requireAuth(request);
    if (authError) {
      return authError;
    }

    const deployedServerData: CreateDeployedServerData = await request.json();

    // Validate required fields
    if (!deployedServerData.name || !deployedServerData.server_ip || !deployedServerData.username || !deployedServerData.repo_url) {
      return NextResponse.json(
        { error: 'Name, server IP, username, and repo URL are required' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        INSERT INTO deployed_servers (name, server_ip, username, repo_url, port, status, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [
        deployedServerData.name,
        deployedServerData.server_ip,
        deployedServerData.username,
        deployedServerData.repo_url,
        deployedServerData.port || 3000,
        'deployed',
        true
      ]);

      const newDeployedServer = result.rows[0];
      return NextResponse.json({ deployedServer: newDeployedServer });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating deployed server:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

