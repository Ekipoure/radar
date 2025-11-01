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
    console.warn('⚠️  BLOCKED: test-data/simple endpoint called during build time!');
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
      console.log('=== Creating simple test monitoring data ===');
      
      // Get existing agents and servers
      const agentsResult = await client.query('SELECT id, name, server_ip FROM agents WHERE is_active = true LIMIT 3');
      const serversResult = await client.query('SELECT id, name, ip_address, color FROM servers WHERE is_active = true LIMIT 5');
      
      console.log(`Found ${agentsResult.rows.length} agents and ${serversResult.rows.length} servers`);
      
      if (agentsResult.rows.length === 0 || serversResult.rows.length === 0) {
        return NextResponse.json({ 
          error: 'No agents or servers found. Please create some first.' 
        }, { status: 400 });
      }
      
      // Clear existing monitoring data
      await client.query('DELETE FROM monitoring_data');
      console.log('Cleared existing monitoring data');
      
      // Create simple test data - just 20 records per agent
      let totalRecords = 0;
      const now = new Date();
      
      for (const agent of agentsResult.rows) {
        console.log(`Creating data for agent: ${agent.name} (${agent.server_ip})`);
        
        for (const server of serversResult.rows) {
          // Create 20 records for each agent-server pair
          for (let i = 0; i < 20; i++) {
            const checkTime = new Date(now.getTime() - (19 - i) * 5 * 60 * 1000); // Every 5 minutes
            
            // Random status
            const random = Math.random();
            let status = 'up';
            if (random < 0.1) status = 'down';
            else if (random < 0.15) status = 'timeout';
            else if (random < 0.2) status = 'error';
            
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
      
      return NextResponse.json({ 
        success: true, 
        message: 'Simple test data created successfully',
        totalRecords,
        agents: agentsResult.rows.length,
        servers: serversResult.rows.length
      });
      
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating simple test data:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
