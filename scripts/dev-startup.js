const { spawn } = require('child_process');
const path = require('path');

console.log('Starting Radar Monitoring System...');

// Start the Next.js development server
const nextProcess = spawn('npm', ['run', 'dev'], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
  shell: true
});

// Start the monitoring service
const monitoringProcess = spawn('npx', ['tsx', 'scripts/startup.ts'], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
  shell: true
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  nextProcess.kill('SIGINT');
  monitoringProcess.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down...');
  nextProcess.kill('SIGTERM');
  monitoringProcess.kill('SIGTERM');
  process.exit(0);
});

nextProcess.on('close', (code) => {
  console.log(`Next.js process exited with code ${code}`);
  monitoringProcess.kill();
});

monitoringProcess.on('close', (code) => {
  console.log(`Monitoring process exited with code ${code}`);
  nextProcess.kill();
});
