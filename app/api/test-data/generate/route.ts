import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';

// Force dynamic rendering to prevent execution during build
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  // CRITICAL: Prevent execution during build time
  // Next.js may execute routes during static generation
  // Check multiple indicators of build time
  const buildIndicators = [
    process.env.NEXT_PHASE === 'phase-production-build',
    process.env.NEXT_PHASE === 'phase-export',
    process.argv.includes('build') && process.env.NODE_ENV === 'production',
    process.env.NEXT_BUILD === 'true',
    // During build, Next.js may not set proper headers or URL
    (!request.url || request.url.includes('/_next/') || !request.url.startsWith('http')),
  ];
  
  if (buildIndicators.some(Boolean)) {
    console.warn('⚠️  BLOCKED: test-data/generate endpoint called during build time!');
    console.warn('⚠️  This endpoint would have DELETED all monitoring_data records!');
    console.warn('⚠️  Build indicators:', {
      NEXT_PHASE: process.env.NEXT_PHASE,
      NODE_ENV: process.env.NODE_ENV,
      argv: process.argv,
      url: request.url,
    });
    // Return empty response to prevent execution
    return new NextResponse(null, { status: 503 });
  }
  try {
    const client = await pool.connect();
    
    try {
      // Set timezone for this connection
      await client.query("SET timezone = 'Asia/Tehran'");
      
      console.log('=== Creating test monitoring data ===');
      
      // First, let's check what servers and agents we have
      const serversResult = await client.query('SELECT id, name, ip_address FROM servers WHERE is_active = true LIMIT 5');
      const agentsResult = await client.query('SELECT id, name, server_ip FROM agents WHERE is_active = true LIMIT 3');
      
      console.log(`Found ${serversResult.rows.length} servers and ${agentsResult.rows.length} agents`);
      
      if (serversResult.rows.length === 0) {
        console.log('No servers found. Creating test servers...');
        await client.query(`
          INSERT INTO servers (name, ip_address, request_type, server_group, is_active, color) VALUES
          ('Google DNS', '8.8.8.8', 'ping', 'global', true, '#4285F4'),
          ('Cloudflare DNS', '1.1.1.1', 'ping', 'global', true, '#F38020'),
          ('OpenDNS', '208.67.222.222', 'ping', 'global', true, '#00A651'),
          ('Local Server', '192.168.1.1', 'ping', 'iranian', true, '#FF6B6B'),
          ('Test Server', '10.0.0.1', 'ping', 'iranian', true, '#4ECDC4')
        `);
        
        const newServersResult = await client.query('SELECT id, name, ip_address FROM servers WHERE is_active = true');
        serversResult.rows = newServersResult.rows;
        console.log('Created test servers');
      }
      
      if (agentsResult.rows.length === 0) {
        console.log('No agents found. Creating test agents...');
        await client.query(`
          INSERT INTO agents (name, server_ip, username, repo_url, status, is_active) VALUES
          ('Agent Tehran', '192.168.1.100', 'admin', 'https://github.com/test/repo', 'deployed', true),
          ('Agent Isfahan', '192.168.1.101', 'admin', 'https://github.com/test/repo', 'deployed', true),
          ('Agent Mashhad', '192.168.1.102', 'admin', 'https://github.com/test/repo', 'deployed', true)
        `);
        
        const newAgentsResult = await client.query('SELECT id, name, server_ip FROM agents WHERE is_active = true');
        agentsResult.rows = newAgentsResult.rows;
        console.log('Created test agents');
      }
      
      // Clear existing monitoring data
      await client.query('DELETE FROM monitoring_data');
      console.log('Cleared existing monitoring data');
      
      // Create test monitoring data for the last 24 hours
      const now = new Date();
      const hoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      const statuses = ['up', 'down', 'timeout', 'error'];
      const statusWeights = [0.8, 0.1, 0.05, 0.05]; // 80% up, 10% down, 5% timeout, 5% error
      
      let totalRecords = 0;
      
      for (const agent of agentsResult.rows) {
        console.log(`Creating data for agent: ${agent.name} (${agent.server_ip})`);
        
        for (const server of serversResult.rows) {
          // Create data for every 5 minutes in the last 24 hours
          for (let i = 0; i < 288; i++) { // 24 hours * 12 (every 5 minutes)
            const checkTime = new Date(hoursAgo.getTime() + i * 5 * 60 * 1000);
            
            // Random status based on weights
            const random = Math.random();
            let status = 'up';
            let cumulativeWeight = 0;
            
            for (let j = 0; j < statuses.length; j++) {
              cumulativeWeight += statusWeights[j];
              if (random <= cumulativeWeight) {
                status = statuses[j];
                break;
              }
            }
            
            const responseTime = status === 'up' ? Math.floor(Math.random() * 200) + 10 : null;
            const errorMessage = status !== 'up' ? `Test error for ${server.name}` : null;
            
            await client.query(`
              INSERT INTO monitoring_data (server_id, source_ip, status, response_time, error_message, checked_at)
              VALUES ($1, $2, $3, $4, $5, $6)
            `, [server.id, agent.server_ip, status, responseTime, errorMessage, checkTime]);
            
            totalRecords++;
          }
        }
      }
      
      console.log(`Created ${totalRecords} monitoring records`);
      
      // Verify the data
      const verifyResult = await client.query(`
        SELECT 
          a.name as agent_name,
          a.server_ip,
          COUNT(md.id) as record_count,
          COUNT(CASE WHEN md.status = 'up' THEN 1 END) as up_count,
          COUNT(CASE WHEN md.status != 'up' THEN 1 END) as down_count
        FROM agents a
        LEFT JOIN monitoring_data md ON md.source_ip::text = a.server_ip::text
        WHERE a.is_active = true
        GROUP BY a.id, a.name, a.server_ip
        ORDER BY a.name
      `);
      
      console.log('\\n=== Verification ===');
      const verification = verifyResult.rows.map(row => ({
        agent_name: row.agent_name,
        server_ip: row.server_ip,
        record_count: parseInt(row.record_count),
        up_count: parseInt(row.up_count),
        down_count: parseInt(row.down_count)
      }));
      
      console.log('✅ Test data created successfully!');
      
      return NextResponse.json({ 
        success: true, 
        message: 'Test data created successfully',
        totalRecords,
        verification
      });
      
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating test data:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
