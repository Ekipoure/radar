import { NextRequest, NextResponse } from 'next/server';
import { DeployAgent, DeployConfig } from '@/lib/deployAgent';
import pool from '@/lib/database';
import { verifyToken } from '@/lib/auth';
import { promises as fs } from 'fs';
import path from 'path';

function getAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

async function saveUploadedFile(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  
  // Create uploads directory if it doesn't exist
  const uploadsDir = path.join(process.cwd(), 'uploads');
  await fs.mkdir(uploadsDir, { recursive: true });
  
  // Generate unique filename
  const timestamp = Date.now();
  const filename = `project-${timestamp}.zip`;
  const filepath = path.join(uploadsDir, filename);
  
  // Write file to disk
  await fs.writeFile(filepath, buffer);
  
  return filepath;
}


export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const token = getAuthToken(request);
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type') || '';
    let config: DeployConfig;
    let agentName: string;
    let repoUrl: string = '';

    if (contentType.includes('multipart/form-data')) {
      // Handle file upload
      const formData = await request.formData();
      
      agentName = formData.get('agentName') as string;
      const serverIp = formData.get('serverIp') as string;
      const username = formData.get('username') as string;
      const password = formData.get('password') as string;
      const envContent = formData.get('envContent') as string;
      const targetPath = formData.get('targetPath') as string;
      const usePM2 = formData.get('usePM2') === 'true';
      const deploymentMode = formData.get('deploymentMode') as string;
      const file = formData.get('file') as File;

      // Validate required fields
      if (!serverIp || !username || !password || !agentName) {
        return NextResponse.json(
          { 
            success: false, 
            message: 'Missing required fields: serverIp, username, password, and agentName are required',
            logs: ['[ERROR] Missing required fields']
          },
          { status: 400 }
        );
      }

      if (deploymentMode === 'upload' && !file) {
        return NextResponse.json(
          { 
            success: false, 
            message: 'File is required for upload deployment mode',
            logs: ['[ERROR] File is required for upload deployment mode']
          },
          { status: 400 }
        );
      }

      // Save uploaded file
      let uploadedFilePath: string | undefined;
      if (deploymentMode === 'upload' && file) {
        uploadedFilePath = await saveUploadedFile(file);
      }

      config = {
        serverIp,
        username,
        password,
        repoUrl: deploymentMode === 'git' ? (formData.get('repoUrl') as string) : undefined,
        envContent,
        targetPath: targetPath || '/var/www/project',
        usePM2: usePM2 !== false,
        deploymentMode: deploymentMode as 'git' | 'upload',
        uploadedFile: uploadedFilePath ? {
          name: file.name,
          content: Buffer.from(await file.arrayBuffer())
        } : undefined
      };

      repoUrl = config.repoUrl || 'uploaded-file';
    } else {
      // Handle JSON request (git deployment)
      const body = await request.json();
      
      agentName = body.agentName;
      const serverIp = body.serverIp;
      const username = body.username;
      const password = body.password;
      repoUrl = body.repoUrl;
      const envContent = body.envContent;
      const targetPath = body.targetPath;
      const usePM2 = body.usePM2;
      const deploymentMode = body.deploymentMode || 'git';

      // Validate required fields
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

      config = {
        serverIp,
        username,
        password,
        repoUrl,
        envContent,
        targetPath: targetPath || '/var/www/project',
        usePM2: usePM2 !== false,
        deploymentMode: deploymentMode as 'git' | 'upload'
      };
    }

    // Basic validation for server IP format
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?(\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?)*$/;
    
    if (!ipRegex.test(config.serverIp) && !domainRegex.test(config.serverIp)) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Invalid server IP or domain format',
          logs: ['[ERROR] Invalid server IP or domain format']
        },
        { status: 400 }
      );
    }

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
            config.serverIp,
            config.username,
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
