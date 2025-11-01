import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';
import { Agent, CreateAgentData } from '@/lib/types';
import { verifyToken } from '@/lib/auth';

function getAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const token = getAuthToken(request);
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        SELECT * FROM agents
        ORDER BY created_at DESC
      `);

      const agents: Agent[] = result.rows;
      return NextResponse.json({ agents });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching agents:', error);
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

    const agentData: CreateAgentData = await request.json();

    // Validate required fields
    if (!agentData.name || !agentData.server_ip || !agentData.username || !agentData.repo_url) {
      return NextResponse.json(
        { error: 'Name, server IP, username, and repo URL are required' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        INSERT INTO agents (name, server_ip, username, repo_url, location, port, status, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        agentData.name,
        agentData.server_ip,
        agentData.username,
        agentData.repo_url,
        agentData.location || 'internal',
        agentData.port || 3000,
        'deployed',
        true
      ]);

      const newAgent = result.rows[0];
      return NextResponse.json({ agent: newAgent });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating agent:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
