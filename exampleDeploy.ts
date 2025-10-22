#!/usr/bin/env tsx

/**
 * Example usage of the DeployAgent
 * 
 * This file demonstrates how to use the DeployAgent programmatically
 * to deploy a Next.js application to a remote server.
 */

import { DeployAgent, DeployConfig } from './lib/deployAgent';
import { promises as fs } from 'fs';
import path from 'path';

async function exampleDeploy() {
  console.log('🚀 Example DeployAgent Usage');
  console.log('============================\n');

  // Example configuration
  const config: DeployConfig = {
    serverIp: '192.168.1.100',        // Replace with your server IP
    username: 'root',                  // Replace with your username
    password: 'your-password',         // Replace with your password
    repoUrl: 'https://github.com/your-username/your-nextjs-app.git', // Replace with your repo
    targetPath: '/var/www/my-app',     // Target directory on server
    usePM2: true,                      // Use PM2 for process management
    envContent: `# Production Environment Variables
NODE_ENV=production
DATABASE_URL=postgresql://user:password@localhost:5432/mydb
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=https://yourdomain.com
API_KEY=your-api-key
REDIS_URL=redis://localhost:6379
` // Environment variables content
  };

  try {
    console.log('Configuration:');
    console.log(`- Server: ${config.serverIp}`);
    console.log(`- Username: ${config.username}`);
    console.log(`- Repository: ${config.repoUrl}`);
    console.log(`- Target Path: ${config.targetPath}`);
    console.log(`- Use PM2: ${config.usePM2}`);
    console.log(`- Environment Variables: ${config.envContent?.split('\n').length || 0} lines\n`);

    // Create deployment agent
    const deployAgent = new DeployAgent(config);

    // Start deployment
    console.log('Starting deployment...\n');
    const result = await deployAgent.deploy();

    // Display results
    console.log('\n' + '='.repeat(60));
    console.log(result.success ? '✅ DEPLOYMENT SUCCESSFUL' : '❌ DEPLOYMENT FAILED');
    console.log('='.repeat(60));
    console.log(`Message: ${result.message}`);
    
    if (result.error) {
      console.log(`Error: ${result.error}`);
    }

    console.log(`\nTotal log entries: ${result.logs.length}`);
    console.log('\nDeployment logs:');
    console.log('-'.repeat(60));
    result.logs.forEach((log, index) => {
      console.log(`${index + 1}. ${log}`);
    });

  } catch (error) {
    console.error('❌ Example deployment failed:', error);
    process.exit(1);
  }
}

// Alternative: Deploy from .env file
async function deployFromEnvFile() {
  console.log('\n🔄 Alternative: Deploy from .env file');
  console.log('=====================================\n');

  const config: DeployConfig = {
    serverIp: '192.168.1.100',
    username: 'root',
    password: 'your-password',
    repoUrl: 'https://github.com/your-username/your-nextjs-app.git',
    envFilePath: './.env.production', // Path to .env file
    usePM2: true
  };

  try {
    const deployAgent = new DeployAgent(config);
    const result = await deployAgent.deploy();
    
    console.log(result.success ? '✅ Success' : '❌ Failed');
    console.log(result.message);
  } catch (error) {
    console.error('❌ Deployment failed:', error);
  }
}

// Run the example
if (require.main === module) {
  exampleDeploy()
    .then(() => {
      console.log('\n✨ Example completed successfully!');
      console.log('\nTo use this in your own project:');
      console.log('1. Import DeployAgent from "./lib/deployAgent"');
      console.log('2. Create a DeployConfig object with your server details');
      console.log('3. Call deployAgent.deploy() to start deployment');
      console.log('\nFor CLI usage, run: npm run deploy-cli');
    })
    .catch((error) => {
      console.error('❌ Example failed:', error);
      process.exit(1);
    });
}

export { exampleDeploy, deployFromEnvFile };
