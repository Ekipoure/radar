import ping from 'ping';
import axios from 'axios';
import net from 'net';
import pool from './database';
import { measureDBQuery } from './performance';
import { Server, MonitoringData, ServerWithStatus, DashboardStats } from './types';

export interface MonitoringResult {
  status: 'up' | 'down' | 'timeout' | 'error' | 'skipped' | 'disabled';
  response_time?: number;
  error_message?: string;
}

export async function pingServer(ip: string, timeout: number): Promise<MonitoringResult> {
  // MONITORING DISABLED - No ping requests
  console.log(`⚠️  Ping disabled for IP: ${ip}`);
  console.log('📊 Using existing database data only');
  
  return {
    status: 'disabled',
    error_message: 'Ping monitoring disabled - No server requests allowed'
  };
}

export async function checkHttpServer(
  url: string, 
  expectedStatusCode: number = 200, 
  timeout: number
): Promise<MonitoringResult> {
  // MONITORING DISABLED - No HTTP requests
  console.log(`⚠️  HTTP check disabled for URL: ${url}`);
  console.log('📊 Using existing database data only');
  
  return {
    status: 'disabled',
    error_message: 'HTTP monitoring disabled - No server requests allowed'
  };
}

export async function checkTcpPort(ip: string, port: number, timeout: number): Promise<MonitoringResult> {
  // MONITORING DISABLED - No TCP requests
  console.log(`⚠️  TCP check disabled for ${ip}:${port}`);
  console.log('📊 Using existing database data only');
  
  return {
    status: 'disabled',
    error_message: 'TCP monitoring disabled - No server requests allowed'
  };
}

export async function monitorServer(server: Server): Promise<MonitoringResult> {
  // MONITORING DISABLED - No requests to servers
  console.log(`⚠️  Monitoring disabled for server: ${server.name} (${server.ip_address})`);
  console.log('📊 Using existing database data only');
  
  return {
    status: 'disabled',
    error_message: 'Monitoring disabled - No server requests allowed'
  };
}

export async function saveMonitoringData(
  serverId: number, 
  result: MonitoringResult,
  sourceIp?: string
): Promise<void> {
  const client = await pool.connect();
  
  try {
    await client.query(
      `INSERT INTO monitoring_data (server_id, source_ip, status, response_time, error_message) 
       VALUES ($1, $2, $3, $4, $5)`,
      [serverId, sourceIp, result.status, result.response_time, result.error_message]
    );
    console.log(`Saved monitoring data for server ${serverId} from source ${sourceIp || 'unknown'}: ${result.status}`);
  } catch (error) {
    console.error(`Failed to save monitoring data for server ${serverId}:`, error);
    throw error; // Re-throw to be handled by caller
  } finally {
    client.release();
  }
}

export async function getServersForMonitoring(): Promise<Server[]> {
  // MONITORING DISABLED - Return empty array to prevent any server requests
  console.log('⚠️  Monitoring disabled - No servers will be checked');
  console.log('📊 Using existing database data only');
  
  return []; // Return empty array - no servers to monitor
}

export async function getMonitoringHistory(
  serverId: number, 
  hours: number = 24
): Promise<MonitoringData[]> {
  return measureDBQuery(`getMonitoringHistory-${serverId}`, async () => {
    const client = await pool.connect();
    
    try {
      // Optimized query with better indexing and limit
      const result = await client.query(
        `SELECT id, server_id, source_ip, status, response_time, error_message, checked_at 
         FROM monitoring_data 
         WHERE server_id = $1 AND checked_at >= NOW() - INTERVAL '${hours} hours'
         ORDER BY checked_at DESC
         LIMIT 1000`,
        [serverId]
      );
      return result.rows;
    } finally {
      client.release();
    }
  });
}

export async function getMonitoringDataBySource(
  sourceIp: string,
  hours: number = 24
): Promise<MonitoringData[]> {
  return measureDBQuery(`getMonitoringDataBySource-${sourceIp}`, async () => {
    const client = await pool.connect();
    
    try {
      // Much more optimized query - use exact match instead of LIKE
      const result = await client.query(
        `SELECT md.id, md.server_id, md.source_ip, md.status, md.response_time, md.error_message, md.checked_at,
                s.name as server_name, s.color as server_color
         FROM monitoring_data md
         JOIN servers s ON md.server_id = s.id
         WHERE md.source_ip = $1 AND md.checked_at >= NOW() - INTERVAL '${hours} hours'
         ORDER BY md.checked_at DESC
         LIMIT 200`,
        [sourceIp]
      );
      return result.rows;
    } finally {
      client.release();
    }
  });
}

export async function getAgentsWithMonitoringData(hours: number = 24): Promise<any[]> {
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      SELECT DISTINCT 
        a.id,
        a.name,
        a.server_ip::text as server_ip,
        a.status as agent_status,
        a.deployed_at,
        a.last_checked as agent_last_checked,
        COUNT(md.id) as monitoring_count,
        MAX(md.checked_at) as last_monitoring_check
      FROM agents a
      LEFT JOIN monitoring_data md ON md.source_ip::text LIKE a.server_ip::text || '%'
        AND md.checked_at >= NOW() - INTERVAL '${hours} hours'
      WHERE a.is_active = true
      GROUP BY a.id, a.name, a.server_ip, a.status, a.deployed_at, a.last_checked
      ORDER BY a.name
    `);
    
    // Calculate actual status based on recent monitoring data
    const agents = [];
    for (const agent of result.rows) {
      // Get recent monitoring data for this agent (last 5 checks in past hour)
      const recentResult = await client.query(`
        SELECT status, checked_at
        FROM monitoring_data
        WHERE source_ip = $1
          AND checked_at > NOW() - INTERVAL '1 hour'
        ORDER BY checked_at DESC
        LIMIT 5
      `, [agent.server_ip]);
      
      const recentData = recentResult.rows;
      
      // Calculate status based on recent data
      let currentStatus = 'unknown';
      if (recentData.length > 0) {
        const successCount = recentData.filter(r => r.status === 'up').length;
        const failedCount = recentData.filter(r => 
          ['down', 'timeout', 'error', 'skipped'].includes(r.status)
        ).length;
        
        if (failedCount === recentData.length && recentData.length > 0) {
          currentStatus = 'inactive';
        } else if (successCount > 0) {
          currentStatus = 'active';
        } else {
          currentStatus = 'unknown';
        }
      } else {
        // If no recent data, use the agent's deployment status
        currentStatus = agent.agent_status === 'deployed' ? 'active' : 'inactive';
      }
      
      agents.push({
        ...agent,
        current_status: currentStatus,
        success_count: recentData.filter(r => r.status === 'up').length,
        failed_count: recentData.filter(r => 
          ['down', 'timeout', 'error', 'skipped'].includes(r.status)
        ).length,
        total_recent_checks: recentData.length
      });
    }
    
    return agents;
  } finally {
    client.release();
  }
}

export async function getServersWithStatus(): Promise<ServerWithStatus[]> {
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      SELECT 
        s.*,
        md.status as current_status,
        md.checked_at as last_checked
      FROM servers s
      LEFT JOIN LATERAL (
        SELECT status, checked_at
        FROM monitoring_data
        WHERE server_id = s.id
        ORDER BY checked_at DESC
        LIMIT 1
      ) md ON true
      WHERE s.is_active = true
      ORDER BY s.created_at DESC
    `);
    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * New logic: Server is considered inactive only if ALL recent requests have failed
 * This function determines server status based on multiple recent monitoring results
 */
export async function getServersWithAdvancedStatus(): Promise<ServerWithStatus[]> {
  const client = await pool.connect();
  
  try {
    // First get all active servers
    const serversResult = await client.query(`
      SELECT s.*
      FROM servers s
      WHERE s.is_active = true
      ORDER BY s.created_at DESC
    `);
    
    const servers = [];
    
    for (const server of serversResult.rows) {
      // Get latest monitoring data for this server
      const latestResult = await client.query(`
        SELECT status, checked_at, response_time, error_message
        FROM monitoring_data
        WHERE server_id = $1
        ORDER BY checked_at DESC
        LIMIT 1
      `, [server.id]);
      
      // Get recent monitoring data (last 5 checks in past hour)
      const recentResult = await client.query(`
        SELECT status
        FROM monitoring_data
        WHERE server_id = $1
          AND checked_at > NOW() - INTERVAL '1 hour'
        ORDER BY checked_at DESC
        LIMIT 5
      `, [server.id]);
      
      const latest = latestResult.rows[0];
      const recentData = recentResult.rows;
      
      // Calculate status based on recent data
      let currentStatus = 'unknown';
      if (recentData.length > 0) {
        const successCount = recentData.filter(r => r.status === 'up').length;
        const failedCount = recentData.filter(r => ['down', 'timeout', 'error', 'skipped'].includes(r.status)).length;
        
        if (failedCount === recentData.length && recentData.length > 0) {
          currentStatus = 'inactive';
        } else if (successCount > 0) {
          currentStatus = 'active';
        } else {
          currentStatus = latest?.status || 'unknown';
        }
      } else {
        currentStatus = latest?.status || 'unknown';
      }
      
      servers.push({
        ...server,
        current_status: currentStatus,
        last_checked: latest?.checked_at,
        response_time: latest?.response_time,
        error_message: latest?.error_message,
        total_count: recentData.length,
        success_count: recentData.filter(r => r.status === 'up').length,
        failed_count: recentData.filter(r => ['down', 'timeout', 'error', 'skipped'].includes(r.status)).length
      });
    }
    
    return servers;
  } finally {
    client.release();
  }
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const client = await pool.connect();
  
  try {
    // Optimized query - get all data in a single query with better performance
    const result = await client.query(`
      WITH server_counts AS (
        SELECT COUNT(*) as total_servers FROM servers WHERE is_active = true
      ),
      agent_counts AS (
        SELECT COUNT(*) as total_agents FROM agents WHERE is_active = true
      ),
      monitoring_stats AS (
        SELECT 
          COUNT(*) as total_checks,
          COUNT(CASE WHEN status = 'up' THEN 1 END) as up_count,
          COUNT(CASE WHEN status = 'down' THEN 1 END) as down_count,
          COUNT(CASE WHEN status = 'timeout' THEN 1 END) as timeout_count,
          COUNT(CASE WHEN status = 'error' THEN 1 END) as error_count
        FROM monitoring_data 
        WHERE checked_at >= NOW() - INTERVAL '24 hours'
      )
      SELECT 
        sc.total_servers,
        ac.total_agents,
        ms.total_checks,
        ms.up_count,
        ms.down_count,
        ms.timeout_count,
        ms.error_count
      FROM server_counts sc, agent_counts ac, monitoring_stats ms
    `);

    const row = result.rows[0];
    const totalServers = parseInt(row.total_servers);
    const totalAgents = parseInt(row.total_agents);
    const totalChecks = parseInt(row.total_checks);
    const upCount = parseInt(row.up_count);
    const downCount = parseInt(row.down_count);
    const timeoutCount = parseInt(row.timeout_count);
    const errorCount = parseInt(row.error_count);

    const uptimePercentage = totalChecks > 0 ? Math.round((upCount / totalChecks) * 100) : 0;

    return {
      totalServers,
      totalAgents,
      totalChecks,
      upCount,
      downCount,
      timeoutCount,
      errorCount,
      uptimePercentage
    };
  } finally {
    client.release();
  }
}
