import ping from 'ping';
import axios from 'axios';
import net from 'net';
import pool from './database';
import { Server, MonitoringData, ServerWithStatus, DashboardStats } from './types';

export interface MonitoringResult {
  status: 'up' | 'down' | 'timeout' | 'error' | 'skipped';
  response_time?: number;
  error_message?: string;
}

export async function pingServer(ip: string, timeout: number): Promise<MonitoringResult> {
  try {
    const startTime = Date.now();
    const result = await ping.promise.probe(ip, {
      timeout: timeout / 1000, // Convert to seconds
      extra: ['-c', '1'] // Send only 1 packet
    });

    const responseTime = Date.now() - startTime;

    if (result.alive) {
      return {
        status: 'up',
        response_time: responseTime
      };
    } else {
      return {
        status: 'down',
        error_message: 'Host unreachable'
      };
    }
  } catch (error) {
    return {
      status: 'error',
      error_message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function checkHttpServer(
  url: string, 
  expectedStatusCode: number = 200, 
  timeout: number
): Promise<MonitoringResult> {
  try {
    const startTime = Date.now();
    
    const response = await axios.get(url, {
      timeout: timeout,
      validateStatus: () => true, // Don't throw on any status code
      maxRedirects: 5
    });

    const responseTime = Date.now() - startTime;

    if (response.status === expectedStatusCode) {
      return {
        status: 'up',
        response_time: responseTime
      };
    } else {
      return {
        status: 'down',
        response_time: responseTime,
        error_message: `Expected ${expectedStatusCode}, got ${response.status}`
      };
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        return {
          status: 'timeout',
          error_message: 'Request timeout'
        };
      }
      return {
        status: 'error',
        error_message: error.message
      };
    }
    return {
      status: 'error',
      error_message: 'Unknown error'
    };
  }
}

export async function checkTcpPort(ip: string, port: number, timeout: number): Promise<MonitoringResult> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const socket = new net.Socket();
    
    const timer = setTimeout(() => {
      socket.destroy();
      resolve({
        status: 'timeout',
        error_message: 'Connection timeout'
      });
    }, timeout);

    socket.connect(port, ip, () => {
      clearTimeout(timer);
      const responseTime = Date.now() - startTime;
      socket.destroy();
      resolve({
        status: 'up',
        response_time: responseTime
      });
    });

    socket.on('error', (error) => {
      clearTimeout(timer);
      const responseTime = Date.now() - startTime;
      resolve({
        status: 'down',
        response_time: responseTime,
        error_message: error.message
      });
    });
  });
}

export async function monitorServer(server: Server): Promise<MonitoringResult> {
  const { ip_address, port, request_type, endpoint, expected_status_code, timeout } = server;

  switch (request_type) {
    case 'ping':
      return await pingServer(ip_address, timeout);

    case 'http':
      const httpUrl = `http://${ip_address}${port ? `:${port}` : ''}${endpoint || ''}`;
      return await checkHttpServer(httpUrl, expected_status_code, timeout);

    case 'https':
      const httpsUrl = `https://${ip_address}${port ? `:${port}` : ''}${endpoint || ''}`;
      return await checkHttpServer(httpsUrl, expected_status_code, timeout);

    case 'tcp':
      if (!port) {
        // If no port is specified for TCP, skip the check
        return {
          status: 'skipped',
          error_message: 'TCP check skipped - no port specified'
        };
      }
      return await checkTcpPort(ip_address, port, timeout);

    default:
      return {
        status: 'error',
        error_message: 'Unknown request type'
      };
  }
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
  const client = await pool.connect();
  
  try {
    // Get servers that need to be checked based on their individual intervals
    const result = await client.query(`
      SELECT s.*, md.checked_at as last_checked
      FROM servers s
      LEFT JOIN LATERAL (
        SELECT checked_at
        FROM monitoring_data
        WHERE server_id = s.id
        ORDER BY checked_at DESC
        LIMIT 1
      ) md ON true
      WHERE s.is_active = true 
        AND (
          md.checked_at IS NULL 
          OR md.checked_at < NOW() - INTERVAL '1 second' * s.check_interval
        )
      ORDER BY s.created_at DESC
    `);
    
    console.log(`Found ${result.rows.length} servers ready for monitoring`);
    
    // Debug: Log details about each server
    result.rows.forEach(server => {
      const lastChecked = server.last_checked ? new Date(server.last_checked) : null;
      const now = new Date();
      const timeSinceLastCheck = lastChecked ? (now.getTime() - lastChecked.getTime()) / 1000 : 'never';
      const intervalSeconds = server.check_interval;
      
      console.log(`Server ${server.name}: interval=${intervalSeconds}s, last_checked=${lastChecked ? lastChecked.toISOString() : 'never'}, time_since=${timeSinceLastCheck}s`);
    });
    
    return result.rows;
  } catch (error) {
    console.error('Failed to get servers for monitoring:', error);
    throw error; // Re-throw to be handled by caller
  } finally {
    client.release();
  }
}

export async function getMonitoringHistory(
  serverId: number, 
  hours: number = 24
): Promise<MonitoringData[]> {
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      `SELECT * FROM monitoring_data 
       WHERE server_id = $1 AND checked_at >= NOW() - INTERVAL '${hours} hours'
       ORDER BY checked_at DESC`,
      [serverId]
    );
    return result.rows;
  } finally {
    client.release();
  }
}

export async function getMonitoringDataBySource(
  sourceIp: string,
  hours: number = 24
): Promise<MonitoringData[]> {
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      `SELECT md.*, s.name as server_name, s.color as server_color
       FROM monitoring_data md
       JOIN servers s ON md.server_id = s.id
       WHERE md.source_ip = $1 AND md.checked_at >= NOW() - INTERVAL '${hours} hours'
       ORDER BY md.checked_at DESC`,
      [sourceIp]
    );
    return result.rows;
  } finally {
    client.release();
  }
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
      LEFT JOIN monitoring_data md ON md.source_ip::text = a.server_ip::text 
        AND md.checked_at >= NOW() - INTERVAL '${hours} hours'
      WHERE a.is_active = true
      GROUP BY a.id, a.name, a.server_ip, a.status, a.deployed_at, a.last_checked
      ORDER BY a.name
    `);
    return result.rows;
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

export async function getDashboardStats(): Promise<DashboardStats> {
  const client = await pool.connect();
  
  try {
    // Get total servers
    const serversResult = await client.query('SELECT COUNT(*) as total FROM servers WHERE is_active = true');
    const totalServers = parseInt(serversResult.rows[0].total);

    // Get total agents
    const agentsResult = await client.query('SELECT COUNT(*) as total FROM agents WHERE is_active = true');
    const totalAgents = parseInt(agentsResult.rows[0].total);

    // Get monitoring data from last 24 hours
    const monitoringResult = await client.query(`
      SELECT 
        COUNT(*) as total_checks,
        COUNT(CASE WHEN status = 'up' THEN 1 END) as up_count,
        COUNT(CASE WHEN status = 'down' THEN 1 END) as down_count,
        COUNT(CASE WHEN status = 'timeout' THEN 1 END) as timeout_count,
        COUNT(CASE WHEN status = 'error' THEN 1 END) as error_count
      FROM monitoring_data 
      WHERE checked_at >= NOW() - INTERVAL '24 hours'
    `);

    const monitoring = monitoringResult.rows[0];
    const totalChecks = parseInt(monitoring.total_checks);
    const upCount = parseInt(monitoring.up_count);
    const downCount = parseInt(monitoring.down_count);
    const timeoutCount = parseInt(monitoring.timeout_count);
    const errorCount = parseInt(monitoring.error_count);

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
