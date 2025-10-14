import ping from 'ping';
import axios from 'axios';
import net from 'net';
import pool from './database';
import { Server, MonitoringData } from './types';

export interface MonitoringResult {
  status: 'up' | 'down' | 'timeout' | 'error';
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
        return {
          status: 'error',
          error_message: 'Port is required for TCP checks'
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
  result: MonitoringResult
): Promise<void> {
  const client = await pool.connect();
  
  try {
    await client.query(
      `INSERT INTO monitoring_data (server_id, status, response_time, error_message) 
       VALUES ($1, $2, $3, $4)`,
      [serverId, result.status, result.response_time, result.error_message]
    );
    console.log(`Saved monitoring data for server ${serverId}: ${result.status}`);
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
    const result = await client.query(
      'SELECT * FROM servers WHERE is_active = true ORDER BY created_at DESC'
    );
    console.log(`Found ${result.rows.length} active servers for monitoring`);
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
