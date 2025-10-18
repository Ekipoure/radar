import { initializeDatabase } from './database';
import monitoringService from './monitoring-service';

class MonitoringManager {
  private static instance: MonitoringManager;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): MonitoringManager {
    if (!MonitoringManager.instance) {
      MonitoringManager.instance = new MonitoringManager();
    }
    return MonitoringManager.instance;
  }

  async initialize() {
    if (this.isInitialized) {
      console.log('Monitoring manager already initialized');
      return;
    }

    try {
      console.log('🚀 Initializing Radar Monitoring System...');
      
      console.log('📊 Initializing database...');
      await initializeDatabase();
      console.log('✅ Database initialized successfully');

      console.log('🔄 Starting monitoring service...');
      monitoringService.start();
      
      // Verify the service is running
      const status = monitoringService.getStatus();
      if (status.isRunning) {
        console.log('✅ Monitoring service started successfully');
        console.log('📡 Service will check servers every 10 seconds (respecting individual intervals)');
        this.isInitialized = true;
      } else {
        console.error('❌ Failed to start monitoring service');
        throw new Error('Failed to start monitoring service');
      }
      
      console.log('🎉 Monitoring manager initialized successfully');
      
    } catch (error) {
      console.error('❌ Monitoring manager initialization failed:', error);
      throw error;
    }
  }

  getStatus() {
    return monitoringService.getStatus();
  }

  start() {
    monitoringService.start();
  }

  stop() {
    monitoringService.stop();
  }
}

// Create singleton instance
const monitoringManager = MonitoringManager.getInstance();

export default monitoringManager;
