// Simple script to simulate agent monitoring data
// This would typically run on deployed agents

const axios = require('axios');

const AGENT_IP = '192.168.1.100'; // Simulated agent IP
const SERVER_URL = 'http://localhost:3000'; // Main server URL

const servers = [
  { id: 1, name: 'Google', ip: '8.8.8.8' },
  { id: 2, name: 'Cloudflare', ip: '1.1.1.1' },
  { id: 3, name: 'Local Server', ip: '192.168.1.1' }
];

async function simulateMonitoring() {
  console.log(`🤖 Simulating agent monitoring from ${AGENT_IP}`);
  
  for (const server of servers) {
    try {
      // Simulate ping check
      const startTime = Date.now();
      
      // Simple ping simulation (in real implementation, this would be actual ping)
      const isUp = Math.random() > 0.2; // 80% uptime
      const responseTime = isUp ? Math.floor(Math.random() * 100) + 10 : null;
      
      const monitoringData = {
        server_id: server.id,
        source_ip: AGENT_IP,
        status: isUp ? 'up' : 'down',
        response_time: responseTime,
        error_message: isUp ? null : 'Host unreachable'
      };
      
      console.log(`📡 Sending data for ${server.name}: ${monitoringData.status}${responseTime ? ` (${responseTime}ms)` : ''}`);
      
      const response = await axios.post(`${SERVER_URL}/api/agents/monitoring/send`, monitoringData);
      
      if (response.data.success) {
        console.log(`✅ Data sent successfully for ${server.name}`);
      } else {
        console.log(`❌ Failed to send data for ${server.name}:`, response.data.error);
      }
      
    } catch (error) {
      console.error(`❌ Error sending data for ${server.name}:`, error.message);
    }
    
    // Wait a bit between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// Run simulation
simulateMonitoring().then(() => {
  console.log('🎉 Simulation completed');
}).catch(error => {
  console.error('💥 Simulation failed:', error);
});
