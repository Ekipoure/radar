import { NextRequest, NextResponse } from 'next/server';
import { DeployAgent, DeployConfig } from '@/lib/deployAgent';
import pool from '@/lib/database';
import { verifyToken } from '@/lib/auth';

function getAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const token = getAuthToken(request);
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate required fields
    const { serverIp, username, password, repoUrl, envContent, targetPath, usePM2, agentName } = body;
    
    if (!serverIp || !username || !password || !repoUrl || !agentName) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Missing required fields: serverIp, username, password, repoUrl, and agentName are required',
          logs: ['[ERROR] Missing required fields']
        },
        { status: 400 }
      );
    }

    if (!envContent || envContent.trim() === '') {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Environment content is required and cannot be empty',
          logs: ['[ERROR] Environment content is required']
        },
        { status: 400 }
      );
    }

    // Basic validation for server IP format
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?(\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?)*$/;
    
    if (!ipRegex.test(serverIp) && !domainRegex.test(serverIp)) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Invalid server IP or domain format',
          logs: ['[ERROR] Invalid server IP or domain format']
        },
        { status: 400 }
      );
    }

    // Create deployment configuration
    const config: DeployConfig = {
      serverIp,
      username,
      password,
      repoUrl,
      envContent,
      targetPath: targetPath || '/var/www/project',
      usePM2: usePM2 !== false // Default to true
    };

    // Create and run deployment agent
    const deployAgent = new DeployAgent(config);
    const result = await deployAgent.deploy();

    // Save agent information to database if deployment was successful
    if (result.success) {
      try {
        const client = await pool.connect();
        
        try {
          const agentResult = await client.query(`
            INSERT INTO agents (name, server_ip, username, repo_url, port, status, is_active)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
          `, [
            agentName,
            serverIp,
            username,
            repoUrl,
            3000, // Default port
            'deployed',
            true
          ]);

          const newAgent = agentResult.rows[0];
          result.agent = newAgent;
        } finally {
          client.release();
        }
      } catch (dbError) {
        console.error('Error saving agent to database:', dbError);
        // Don't fail the deployment if database save fails
        result.message += ' (Warning: Agent info not saved to database)';
      }
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Deployment API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error during deployment',
        logs: ['[ERROR] Internal server error during deployment'],
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { 
      message: 'Deployment API endpoint. Use POST to deploy.',
      endpoints: {
        'POST /api/deploy': 'Deploy a Next.js application to a remote server'
      }
    },
    { status: 200 }
  );
}
