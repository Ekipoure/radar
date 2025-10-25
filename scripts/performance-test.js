#!/usr/bin/env node

// Performance test script to measure API response times
const fetch = require('node-fetch');

const API_BASE = process.env.API_BASE || 'http://localhost:3000';

async function measureAPICall(endpoint, name) {
  const startTime = Date.now();
  try {
    const response = await fetch(`${API_BASE}${endpoint}`);
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`✅ ${name}: ${duration}ms (Status: ${response.status})`);
    return { success: true, duration, status: response.status };
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    console.log(`❌ ${name}: ${duration}ms (Error: ${error.message})`);
    return { success: false, duration, error: error.message };
  }
}

async function runPerformanceTest() {
  console.log('🚀 Starting Performance Test...\n');
  
  const tests = [
    { endpoint: '/api/dashboard/stats', name: 'Dashboard Stats' },
    { endpoint: '/api/servers', name: 'Servers List' },
    { endpoint: '/api/agents', name: 'Agents List' },
    { endpoint: '/api/agents/monitoring?hours=6', name: 'Agents Monitoring (6h)' },
    { endpoint: '/api/agents/monitoring?hours=24', name: 'Agents Monitoring (24h)' },
  ];

  const results = [];
  
  // Run each test 3 times to get average
  for (const test of tests) {
    console.log(`\n📊 Testing: ${test.name}`);
    const testResults = [];
    
    for (let i = 0; i < 3; i++) {
      const result = await measureAPICall(test.endpoint, `${test.name} (Attempt ${i + 1})`);
      testResults.push(result);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between requests
    }
    
    const successfulResults = testResults.filter(r => r.success);
    const avgDuration = successfulResults.length > 0 
      ? Math.round(successfulResults.reduce((sum, r) => sum + r.duration, 0) / successfulResults.length)
      : 0;
    
    results.push({
      name: test.name,
      endpoint: test.endpoint,
      avgDuration,
      successRate: (successfulResults.length / testResults.length) * 100,
      results: testResults
    });
    
    console.log(`📈 Average: ${avgDuration}ms (Success Rate: ${Math.round((successfulResults.length / testResults.length) * 100)}%)`);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 PERFORMANCE TEST SUMMARY');
  console.log('='.repeat(60));
  
  results.forEach(result => {
    const status = result.successRate === 100 ? '✅' : result.successRate > 0 ? '⚠️' : '❌';
    console.log(`${status} ${result.name}: ${result.avgDuration}ms (${Math.round(result.successRate)}% success)`);
  });
  
  const totalAvg = results.reduce((sum, r) => sum + r.avgDuration, 0) / results.length;
  console.log(`\n🎯 Overall Average Response Time: ${Math.round(totalAvg)}ms`);
  
  // Performance recommendations
  console.log('\n💡 PERFORMANCE RECOMMENDATIONS:');
  const slowEndpoints = results.filter(r => r.avgDuration > 1000);
  if (slowEndpoints.length > 0) {
    console.log('⚠️  Slow endpoints detected:');
    slowEndpoints.forEach(endpoint => {
      console.log(`   - ${endpoint.name}: ${endpoint.avgDuration}ms`);
    });
  } else {
    console.log('✅ All endpoints are performing well!');
  }
  
  console.log('\n🔧 OPTIMIZATION TIPS:');
  console.log('   - Enable caching for frequently accessed data');
  console.log('   - Use database indexes for better query performance');
  console.log('   - Implement request throttling to prevent overload');
  console.log('   - Monitor memory usage and optimize data structures');
}

// Run the test
runPerformanceTest().catch(console.error);
