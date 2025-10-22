import { Client } from 'ssh2';
import { promises as fs } from 'fs';
import path from 'path';

export interface DeployConfig {
  serverIp: string;
  username: string;
  password: string;
  repoUrl: string;
  envContent?: string;
  envFilePath?: string;
  targetPath?: string;
  usePM2?: boolean;
}

export interface DeployResult {
  success: boolean;
  message: string;
  logs: string[];
  error?: string;
  agent?: any; // Agent data from database
}

export class DeployAgent {
  private config: DeployConfig;
  private logs: string[] = [];

  constructor(config: DeployConfig) {
    this.config = {
      targetPath: '/var/www/project',
      usePM2: true,
      ...config
    };
  }

  private log(message: string): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    this.logs.push(logMessage);
    console.log(logMessage);
  }

  private async readEnvFile(): Promise<string> {
    if (this.config.envContent) {
      return this.config.envContent;
    }

    if (this.config.envFilePath) {
      try {
        return await fs.readFile(this.config.envFilePath, 'utf-8');
      } catch (error) {
        throw new Error(`Failed to read .env file: ${error}`);
      }
    }

    throw new Error('Either envContent or envFilePath must be provided');
  }

  private async executeSSHCommand(conn: Client, command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // Set up command timeout
      const timeout = setTimeout(() => {
        reject(new Error(`Command timeout after 60 seconds: ${command}`));
      }, 60000); // 60 second timeout for commands

      conn.exec(command, (err, stream) => {
        if (err) {
          clearTimeout(timeout);
          reject(err);
          return;
        }

        let output = '';
        let errorOutput = '';

        stream.on('close', (code: number) => {
          clearTimeout(timeout);
          if (code === 0) {
            resolve(output);
          } else {
            reject(new Error(`Command failed with code ${code}: ${errorOutput}`));
          }
        });

        stream.on('data', (data: Buffer) => {
          const dataStr = data.toString();
          output += dataStr;
          this.log(dataStr.trim());
        });

        stream.stderr.on('data', (data: Buffer) => {
          const dataStr = data.toString();
          errorOutput += dataStr;
          this.log(`ERROR: ${dataStr.trim()}`);
        });
      });
    });
  }

  private async uploadFile(conn: Client, content: string, remotePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Set up upload timeout
      const timeout = setTimeout(() => {
        reject(new Error(`File upload timeout after 60 seconds: ${remotePath}`));
      }, 60000); // 60 second timeout for file uploads

      conn.sftp((err, sftp) => {
        if (err) {
          clearTimeout(timeout);
          reject(err);
          return;
        }

        this.log(`Starting file upload to ${remotePath}...`);
        
        const writeStream = sftp.createWriteStream(remotePath, {
          mode: 0o644, // Set proper file permissions
          flags: 'w'    // Write mode
        });
        
        writeStream.on('error', (error: Error) => {
          clearTimeout(timeout);
          this.log(`✗ File upload error: ${error.message}`);
          reject(error);
        });

        writeStream.on('finish', () => {
          clearTimeout(timeout);
          this.log(`✓ File uploaded successfully to ${remotePath}`);
          resolve();
        });

        writeStream.on('close', () => {
          clearTimeout(timeout);
          this.log(`✓ File upload completed to ${remotePath}`);
          resolve();
        });

        // Write the content
        try {
          writeStream.write(content, 'utf8');
          writeStream.end();
        } catch (error) {
          clearTimeout(timeout);
          reject(error);
        }
      });
    });
  }

  public async deploy(): Promise<DeployResult> {
    this.logs = [];
    this.log('Starting deployment process...');

    try {
      // Read .env file content
      this.log('Reading .env file...');
      const envContent = await this.readEnvFile();
      this.log('✓ .env file content loaded');

      // Connect to server
      this.log(`Connecting to ${this.config.serverIp}...`);
      const conn = new Client();
      
      await new Promise<void>((resolve, reject) => {
        // Set up timeout
        const timeout = setTimeout(() => {
          conn.end();
          reject(new Error('Connection timeout after 15 seconds'));
        }, 15000); // 15 second timeout

        conn.on('ready', () => {
          clearTimeout(timeout);
          this.log('✓ Connected to server successfully');
          resolve();
        });

        conn.on('error', (err) => {
          clearTimeout(timeout);
          this.log(`✗ Connection failed: ${err.message}`);
          reject(err);
        });

        conn.connect({
          host: this.config.serverIp,
          username: this.config.username,
          password: this.config.password,
          readyTimeout: 10000, // 10 second ready timeout
          keepaliveInterval: 5000, // 5 second keepalive
          algorithms: {
            serverHostKey: ['ssh-rsa', 'ssh-ed25519'],
            kex: ['diffie-hellman-group14-sha256', 'diffie-hellman-group16-sha512'],
            cipher: ['aes128-ctr', 'aes192-ctr', 'aes256-ctr'],
            hmac: ['hmac-sha2-256', 'hmac-sha2-512']
          }
        });
      });

      // Create target directory if it doesn't exist
      this.log(`Creating target directory ${this.config.targetPath}...`);
      await this.executeSSHCommand(conn, `mkdir -p ${this.config.targetPath}`);
      this.log('✓ Target directory ready');

      // Clone or pull repository
      this.log(`Cloning/pulling repository from ${this.config.repoUrl}...`);
      const repoExists = await this.executeSSHCommand(conn, `test -d ${this.config.targetPath}/.git && echo "exists" || echo "not_exists"`);
      
      if (repoExists.trim() === 'exists') {
        this.log('Repository exists, pulling latest changes...');
        await this.executeSSHCommand(conn, `cd ${this.config.targetPath} && git pull origin main`);
      } else {
        this.log('Cloning repository...');
        await this.executeSSHCommand(conn, `git clone ${this.config.repoUrl} ${this.config.targetPath}`);
      }
      this.log('✓ Repository updated');

      // Upload .env file
      this.log('Uploading .env file...');
      const envPath = `${this.config.targetPath}/.env`;
      this.log(`File size: ${envContent.length} characters`);
      
      try {
        // Try SFTP upload first
        this.log('Attempting SFTP upload...');
        await this.uploadFile(conn, envContent, envPath);
        this.log('✓ .env file uploaded via SFTP');
      } catch (error) {
        this.log(`SFTP upload failed: ${error.message}`);
        this.log('Trying alternative method...');
        try {
          // Alternative 1: Use base64 encoding to handle special characters
          this.log('Attempting base64 method...');
          const base64Content = Buffer.from(envContent, 'utf8').toString('base64');
          await this.executeSSHCommand(conn, `echo '${base64Content}' | base64 -d > ${envPath}`);
          this.log('✓ .env file uploaded via base64 method');
        } catch (base64Error) {
          this.log(`Base64 method failed: ${base64Error.message}`);
          this.log('Trying temporary file method...');
          try {
            // Alternative 2: Create temporary file and move it
            const tempFile = `/tmp/.env.${Date.now()}`;
            const base64Content = Buffer.from(envContent, 'utf8').toString('base64');
            await this.executeSSHCommand(conn, `echo '${base64Content}' | base64 -d > ${tempFile} && mv ${tempFile} ${envPath}`);
            this.log('✓ .env file uploaded via temporary file method');
          } catch (tempError) {
            this.log(`Temporary file method failed: ${tempError.message}`);
            this.log('Trying simple echo method...');
            // Alternative 3: Simple echo with proper escaping
            const escapedContent = envContent.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\$/g, '\\$');
            await this.executeSSHCommand(conn, `echo "${escapedContent}" > ${envPath}`);
            this.log('✓ .env file uploaded via echo method');
          }
        }
      }

      // Verify .env file was uploaded correctly
      this.log('Verifying .env file upload...');
      try {
        const fileCheck = await this.executeSSHCommand(conn, `test -f ${envPath} && echo "File exists" || echo "File missing"`);
        if (fileCheck.trim() === 'File exists') {
          this.log('✓ .env file verified on server');
        } else {
          throw new Error('.env file was not created on server');
        }
      } catch (error) {
        this.log(`⚠️ Could not verify .env file: ${error}`);
      }

      // Install dependencies
      this.log('Installing dependencies...');
      await this.executeSSHCommand(conn, `cd ${this.config.targetPath} && npm install`);
      this.log('✓ Dependencies installed');

      // Build the project
      this.log('Building the project...');
      await this.executeSSHCommand(conn, `cd ${this.config.targetPath} && npm run build`);
      this.log('✓ Project built successfully');

        // Stop existing process if running
        if (this.config.usePM2) {
          this.log('Stopping existing PM2 processes...');
          try {
            const targetPath = this.config.targetPath || '/var/www/project';
            await this.executeSSHCommand(conn, `pm2 stop ${path.basename(targetPath)} || true`);
            await this.executeSSHCommand(conn, `pm2 delete ${path.basename(targetPath)} || true`);
          } catch (error) {
            this.log('No existing PM2 process found (this is normal for first deployment)');
          }
        }

      // Start the application
      this.log('Starting the application...');
      const targetPath = this.config.targetPath || '/var/www/project';
      if (this.config.usePM2) {
        await this.executeSSHCommand(conn, `cd ${targetPath} && pm2 start npm --name "${path.basename(targetPath)}" -- start`);
        this.log('✓ Application started with PM2');
      } else {
        await this.executeSSHCommand(conn, `cd ${targetPath} && nohup npm start > app.log 2>&1 &`);
        this.log('✓ Application started in background');
      }

      // Save PM2 configuration
      if (this.config.usePM2) {
        this.log('Saving PM2 configuration...');
        await this.executeSSHCommand(conn, 'pm2 save');
        this.log('✓ PM2 configuration saved');
      }

      conn.end();
      this.log('✓ Deployment completed successfully!');

      return {
        success: true,
        message: 'Deployment completed successfully',
        logs: this.logs
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.log(`✗ Deployment failed: ${errorMessage}`);
      
      return {
        success: false,
        message: 'Deployment failed',
        logs: this.logs,
        error: errorMessage
      };
    }
  }

  public getLogs(): string[] {
    return this.logs;
  }
}

// CLI interface for direct usage
export async function runDeployFromCLI(): Promise<void> {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (query: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(query, resolve);
    });
  };

  try {
    console.log('🚀 Next.js Deployment Agent');
    console.log('============================\n');

    const serverIp = await question('Server IP: ');
    const username = await question('Username: ');
    const password = await question('Password: ');
    const repoUrl = await question('Repository URL: ');
    const envPath = await question('Path to .env file (or press Enter to skip): ');
    const usePM2 = (await question('Use PM2? (y/n, default: y): ')).toLowerCase() !== 'n';

    const config: DeployConfig = {
      serverIp,
      username,
      password,
      repoUrl,
      envFilePath: envPath || undefined,
      usePM2
    };

    const agent = new DeployAgent(config);
    const result = await agent.deploy();

    console.log('\n' + '='.repeat(50));
    console.log(result.success ? '✅ DEPLOYMENT SUCCESSFUL' : '❌ DEPLOYMENT FAILED');
    console.log('='.repeat(50));
    console.log(result.message);
    
    if (!result.success && result.error) {
      console.log('\nError:', result.error);
    }

    console.log('\nDeployment logs:');
    result.logs.forEach(log => console.log(log));

  } catch (error) {
    console.error('CLI Error:', error);
  } finally {
    rl.close();
  }
}

// Export for programmatic usage
export default DeployAgent;
