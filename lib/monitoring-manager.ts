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
      
      // Monitoring service is now disabled - no server requests
      const status = monitoringService.getStatus();
      console.log('✅ Monitoring service initialized (DISABLED - No server requests)');
      console.log('📊 System will only use existing database data');
      this.isInitialized = true;
      
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
