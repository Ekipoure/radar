import cron from 'node-cron';
import { getServersForMonitoring, monitorServer, saveMonitoringData } from './monitoring';
import { Server } from './types';
import pool from './database';

class MonitoringService {
  private isRunning = false;
  private cronJob: cron.ScheduledTask | null = null;

  start() {
    if (this.isRunning) {
      console.log('Monitoring service is already running');
      return;
    }

    console.log('⚠️  Monitoring service is DISABLED - No requests will be made to servers');
    console.log('📊 System will only use existing database data');
    this.isRunning = false; // Keep as false to indicate no active monitoring

    // DO NOT start cron job - monitoring is disabled
    console.log('✅ Monitoring service disabled - No server requests will be made');
  }

  stop() {
    if (!this.isRunning) {
      console.log('Monitoring service is not running');
      return;
    }

    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }

    this.isRunning = false;
    console.log('Monitoring service stopped');
  }

  private async runMonitoringCycle() {
    // MONITORING DISABLED - No server requests
    console.log('⚠️  Monitoring cycle disabled - No server requests will be made');
    console.log('📊 Using existing database data only');
    return; // Exit early - no monitoring
  }

  private async monitorSingleServer(server: Server) {
    // MONITORING DISABLED - No server requests
    console.log(`⚠️  Monitoring disabled for server: ${server.name} (${server.ip_address})`);
    console.log('📊 Using existing database data only');
    return; // Exit early - no monitoring
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  async checkServerImmediately(serverId: number): Promise<void> {
    try {
      console.log(`Checking server ${serverId} immediately...`);
      const client = await pool.connect();
      
      try {
        const result = await client.query('SELECT * FROM servers WHERE id = $1 AND is_active = true', [serverId]);
        
        if (result.rows.length === 0) {
          console.log(`Server ${serverId} not found or not active`);
          return;
        }
        
        const server = result.rows[0];
        await this.monitorSingleServer(server);
        console.log(`Immediate check completed for server ${server.name}`);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error(`Error checking server ${serverId} immediately:`, error);
    }
  }

  getStatus() {
    return {
      isRunning: false, // Always false - monitoring disabled
      hasCronJob: false, // No cron job - monitoring disabled
      disabled: true, // Indicate monitoring is disabled
      message: 'Monitoring disabled - No server requests allowed'
    };
  }
}

// Create singleton instance
const monitoringService = new MonitoringService();

export default monitoringService;
