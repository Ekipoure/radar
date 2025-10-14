import { initializeDatabase } from '../lib/database';
import monitoringService from '../lib/monitoring-service';

async function startup() {
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
      console.log('📡 Service will check servers every 30 seconds');
    } else {
      console.error('❌ Failed to start monitoring service');
      process.exit(1);
    }
    
    console.log('🎉 Startup completed successfully');
    
    // Keep the process alive and log status periodically
    setInterval(() => {
      const currentStatus = monitoringService.getStatus();
      console.log(`📊 Monitoring service status: ${currentStatus.isRunning ? 'RUNNING' : 'STOPPED'}`);
    }, 60000); // Log every minute
    
  } catch (error) {
    console.error('❌ Startup failed:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down monitoring service...');
  monitoringService.stop();
  console.log('👋 Goodbye!');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down monitoring service...');
  monitoringService.stop();
  console.log('👋 Goodbye!');
  process.exit(0);
});

// Handle uncaught exceptions to prevent crashes
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  console.log('🔄 Attempting to restart monitoring service...');
  monitoringService.stop();
  setTimeout(() => {
    monitoringService.start();
  }, 5000);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit, just log the error
});

startup();
