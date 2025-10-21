const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testAPI() {
  try {
    console.log('Testing API endpoints...');
    
    // Test servers endpoint
    console.log('\n1. Testing /api/public/servers...');
    const serversResponse = await fetch('http://localhost:3000/api/public/servers');
    console.log('Status:', serversResponse.status);
    
    if (serversResponse.ok) {
      const serversData = await serversResponse.json();
      console.log('Servers data:', JSON.stringify(serversData, null, 2));
      
      if (serversData.servers && serversData.servers.length > 0) {
        const firstServer = serversData.servers[0];
        console.log(`\n2. Testing monitoring data for server ${firstServer.id}...`);
        
        const monitoringResponse = await fetch(`http://localhost:3000/api/public/servers/${firstServer.id}/monitoring?hours=6`);
        console.log('Monitoring status:', monitoringResponse.status);
        
        if (monitoringResponse.ok) {
          const monitoringData = await monitoringResponse.json();
          console.log('Monitoring data count:', monitoringData.length);
          if (monitoringData.length > 0) {
            console.log('Sample monitoring data:', JSON.stringify(monitoringData[0], null, 2));
          } else {
            console.log('No monitoring data found');
          }
        } else {
          const errorText = await monitoringResponse.text();
          console.log('Monitoring error:', errorText);
        }
      } else {
        console.log('No servers found');
      }
    } else {
      const errorText = await serversResponse.text();
      console.log('Servers error:', errorText);
    }
    
    // Test monitoring initialization
    console.log('\n3. Testing monitoring initialization...');
    const initResponse = await fetch('http://localhost:3000/api/init-monitoring', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    console.log('Init status:', initResponse.status);
    
    if (initResponse.ok) {
      const initData = await initResponse.json();
      console.log('Init response:', JSON.stringify(initData, null, 2));
    } else {
      const errorText = await initResponse.text();
      console.log('Init error:', errorText);
    }
    
  } catch (error) {
    console.error('Error testing API:', error);
  }
}

testAPI();