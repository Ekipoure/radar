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

    console.log('Starting monitoring service...');
    this.isRunning = true;

    // Run monitoring every 10 seconds to better handle different intervals
    this.cronJob = cron.schedule('*/10 * * * * *', async () => {
      await this.runMonitoringCycle();
    });

    console.log('Monitoring service started');
    
    // Verify the cron job was created
    if (this.cronJob) {
      console.log('✅ Cron job scheduled successfully');
    } else {
      console.error('❌ Failed to create cron job');
      this.isRunning = false;
    }
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
    try {
      console.log('🔄 Starting monitoring cycle...');
      const servers = await getServersForMonitoring();
      
      if (servers.length === 0) {
        console.log('ℹ️ No active servers to monitor');
        return;
      }

      console.log(`📊 Running monitoring cycle for ${servers.length} servers`);

      // Process servers in parallel with a concurrency limit
      const concurrencyLimit = 10;
      const chunks = this.chunkArray(servers, concurrencyLimit);

      for (const chunk of chunks) {
        await Promise.all(
          chunk.map(server => this.monitorSingleServer(server))
        );
      }
      
      console.log('✅ Monitoring cycle completed successfully');
    } catch (error) {
      console.error('❌ Error in monitoring cycle:', error);
      // Don't let errors stop the service - log and continue
    }
  }

  private async monitorSingleServer(server: Server) {
    try {
      console.log(`🔍 Monitoring server: ${server.name} (${server.ip_address}) - Type: ${server.request_type}`);
      const result = await monitorServer(server);
      // For now, we'll save without source_ip since this runs on the main server
      // In a real deployment, agents would send their monitoring data with source_ip
      await saveMonitoringData(server.id, result);
      
      console.log(`✅ Server ${server.name} (${server.ip_address}): ${result.status}${result.response_time ? ` (${result.response_time}ms)` : ''}`);
    } catch (error) {
      console.error(`❌ Error monitoring server ${server.name}:`, error);
      
      try {
        // Save error status
        await saveMonitoringData(server.id, {
          status: 'error',
          error_message: error instanceof Error ? error.message : 'Unknown error'
        });
        console.log(`💾 Saved error status for server ${server.name}`);
      } catch (saveError) {
        console.error(`❌ Failed to save error status for server ${server.name}:`, saveError);
      }
    }
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
      isRunning: this.isRunning,
      hasCronJob: this.cronJob !== null
    };
  }
}

// Create singleton instance
const monitoringService = new MonitoringService();

export default monitoringService;
