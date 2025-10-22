import { Client } from 'ssh2';
import { promises as fs } from 'fs';
import path from 'path';

export interface DeployConfig {
  serverIp: string;
  username: string;
  password: string;
  repoUrl?: string;
  envContent?: string;
  envFilePath?: string;
  targetPath?: string;
  usePM2?: boolean;
  // File upload mode
  deploymentMode?: 'git' | 'upload';
  uploadedFile?: {
    name: string;
    content: Buffer;
  };
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

  private async readEnvFile(): Promise<string | null> {
    if (this.config.envContent && this.config.envContent.trim()) {
      return this.config.envContent;
    }

    if (this.config.envFilePath) {
      try {
        return await fs.readFile(this.config.envFilePath, 'utf-8');
      } catch (error) {
        this.log(`Warning: Could not read .env file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return null;
      }
    }

    return null;
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

  private async uploadFile(conn: Client, content: string, remotePath: string, isBase64: boolean = false): Promise<void> {
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
          if (isBase64) {
            // For base64 content, decode it first
            const buffer = Buffer.from(content, 'base64');
            writeStream.write(buffer);
          } else {
            writeStream.write(content, 'utf8');
          }
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
      // Read .env file content (optional)
      this.log('Reading .env file...');
      const envContent = await this.readEnvFile();
      if (envContent) {
        this.log('✓ .env file content loaded');
      } else {
        this.log('ℹ️ No .env file content provided (optional)');
      }

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

      // Handle project deployment based on mode
      if (this.config.deploymentMode === 'upload' && this.config.uploadedFile) {
        // Upload and extract ZIP file
        this.log('Uploading project ZIP file...');
        const zipPath = `/tmp/project-${Date.now()}.zip`;
        await this.uploadFile(conn, this.config.uploadedFile.content.toString('base64'), zipPath, true);
        this.log('✓ ZIP file uploaded');
        
        this.log('Extracting ZIP file...');
        
        // Try multiple extraction methods
        let extractionSuccessful = false;
        
        // Method 1: Try unzip command
        try {
          this.log('Trying unzip command...');
          await this.executeSSHCommand(conn, `cd ${this.config.targetPath} && unzip -o ${zipPath} && rm ${zipPath}`);
          this.log('✓ Project extracted successfully using unzip');
          extractionSuccessful = true;
        } catch (unzipError) {
          this.log(`unzip command failed: ${unzipError instanceof Error ? unzipError.message : 'Unknown error'}`);
        }
        
        // Method 2: Try Python zipfile module
        if (!extractionSuccessful) {
          try {
            this.log('Trying Python zipfile extraction...');
            await this.executeSSHCommand(conn, `python3 -c "
import zipfile
import os
import sys

try:
    with zipfile.ZipFile('${zipPath}', 'r') as zip_ref:
        zip_ref.extractall('${this.config.targetPath}')
    print('Extraction successful')
    os.remove('${zipPath}')
except Exception as e:
    print(f'Extraction failed: {e}')
    sys.exit(1)
"`);
            this.log('✓ Project extracted successfully using Python');
            extractionSuccessful = true;
          } catch (pythonError) {
            this.log(`Python extraction failed: ${pythonError instanceof Error ? pythonError.message : 'Unknown error'}`);
          }
        }
        
        // Method 3: Try installing unzip and then extracting
        if (!extractionSuccessful) {
          try {
            this.log('Trying to install unzip and extract...');
            await this.executeSSHCommand(conn, `sudo apt-get update && sudo apt-get install -y unzip`);
            await this.executeSSHCommand(conn, `cd ${this.config.targetPath} && unzip -o ${zipPath} && rm ${zipPath}`);
            this.log('✓ Project extracted successfully after installing unzip');
            extractionSuccessful = true;
          } catch (installError) {
            this.log(`Installing unzip failed: ${installError instanceof Error ? installError.message : 'Unknown error'}`);
          }
        }
        
        // Method 4: Try using 7z if available
        if (!extractionSuccessful) {
          try {
            this.log('Trying 7z command...');
            await this.executeSSHCommand(conn, `cd ${this.config.targetPath} && 7z x ${zipPath} -o. && rm ${zipPath}`);
            this.log('✓ Project extracted successfully using 7z');
            extractionSuccessful = true;
          } catch (sevenZError) {
            this.log(`7z command failed: ${sevenZError instanceof Error ? sevenZError.message : 'Unknown error'}`);
          }
        }
        
        if (!extractionSuccessful) {
          throw new Error('Failed to extract ZIP file. The server does not have unzip, Python3, 7z, or sudo privileges to install them. Please install unzip manually on the server.');
        }
        
        // Fix file permissions after extraction
        this.log('Fixing file permissions...');
        try {
          await this.executeSSHCommand(conn, `find ${this.config.targetPath} -type f -name "*.js" -exec chmod +x {} \\;`);
          await this.executeSSHCommand(conn, `find ${this.config.targetPath} -type f -name "tsc" -exec chmod +x {} \\;`);
          await this.executeSSHCommand(conn, `find ${this.config.targetPath} -type f -name "node" -exec chmod +x {} \\;`);
          await this.executeSSHCommand(conn, `find ${this.config.targetPath} -type f -name "npm" -exec chmod +x {} \\;`);
          await this.executeSSHCommand(conn, `chmod -R +x ${this.config.targetPath}/node_modules/.bin/ 2>/dev/null || true`);
          this.log('✓ File permissions fixed');
        } catch (permError) {
          this.log(`Warning: Could not fix all permissions: ${permError instanceof Error ? permError.message : 'Unknown error'}`);
        }
      } else if (this.config.deploymentMode === 'git' && this.config.repoUrl) {
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
      } else {
        throw new Error('Invalid deployment mode or missing required data');
      }

      // Upload .env file (only if content is provided)
      if (envContent && envContent.trim()) {
        this.log('Uploading .env file...');
        const envPath = `${this.config.targetPath}/.env`;
        this.log(`File size: ${envContent.length} characters`);
        
        try {
          // Try SFTP upload first
          this.log('Attempting SFTP upload...');
          await this.uploadFile(conn, envContent, envPath);
          this.log('✓ .env file uploaded via SFTP');
        } catch (error) {
          this.log(`SFTP upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          this.log('Trying alternative method...');
          try {
            // Alternative 1: Use base64 encoding to handle special characters
            this.log('Attempting base64 method...');
            const base64Content = Buffer.from(envContent, 'utf8').toString('base64');
            await this.executeSSHCommand(conn, `echo '${base64Content}' | base64 -d > ${envPath}`);
            this.log('✓ .env file uploaded via base64 method');
          } catch (base64Error) {
            this.log(`Base64 method failed: ${base64Error instanceof Error ? base64Error.message : 'Unknown error'}`);
            this.log('Trying temporary file method...');
            try {
              // Alternative 2: Create temporary file and move it
              const tempFile = `/tmp/.env.${Date.now()}`;
              const base64Content = Buffer.from(envContent, 'utf8').toString('base64');
              await this.executeSSHCommand(conn, `echo '${base64Content}' | base64 -d > ${tempFile} && mv ${tempFile} ${envPath}`);
              this.log('✓ .env file uploaded via temporary file method');
            } catch (tempError) {
              this.log(`Temporary file method failed: ${tempError instanceof Error ? tempError.message : 'Unknown error'}`);
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
      } else {
        this.log('ℹ️ Skipping .env file upload (no content provided)');
      }

      // Install Node.js and npm if not available
      this.log('Checking for Node.js and npm...');
      try {
        await this.executeSSHCommand(conn, `node --version && npm --version`);
        this.log('✓ Node.js and npm are already installed');
      } catch (error) {
        this.log('Node.js and npm not found, installing...');
        
        // Try multiple installation methods
        let nodeInstalled = false;
        
        // Method 1: Try using NodeSource repository (recommended)
        try {
          this.log('Trying NodeSource installation...');
          await this.executeSSHCommand(conn, `
            curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - &&
            sudo apt-get install -y nodejs
          `);
          await this.executeSSHCommand(conn, `node --version && npm --version`);
          this.log('✓ Node.js and npm installed via NodeSource');
          nodeInstalled = true;
        } catch (nodeSourceError) {
          this.log(`NodeSource installation failed: ${nodeSourceError instanceof Error ? nodeSourceError.message : 'Unknown error'}`);
        }
        
        // Method 2: Try using snap
        if (!nodeInstalled) {
          try {
            this.log('Trying snap installation...');
            await this.executeSSHCommand(conn, `sudo snap install node --classic`);
            await this.executeSSHCommand(conn, `node --version && npm --version`);
            this.log('✓ Node.js and npm installed via snap');
            nodeInstalled = true;
          } catch (snapError) {
            this.log(`Snap installation failed: ${snapError instanceof Error ? snapError.message : 'Unknown error'}`);
          }
        }
        
        // Method 3: Try using apt package manager
        if (!nodeInstalled) {
          try {
            this.log('Trying apt installation...');
            await this.executeSSHCommand(conn, `sudo apt-get update && sudo apt-get install -y nodejs npm`);
            await this.executeSSHCommand(conn, `node --version && npm --version`);
            this.log('✓ Node.js and npm installed via apt');
            nodeInstalled = true;
          } catch (aptError) {
            this.log(`Apt installation failed: ${aptError instanceof Error ? aptError.message : 'Unknown error'}`);
          }
        }
        
        // Method 4: Try using nvm (Node Version Manager)
        if (!nodeInstalled) {
          try {
            this.log('Trying nvm installation...');
            await this.executeSSHCommand(conn, `
              curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash &&
              export NVM_DIR="$HOME/.nvm" &&
              [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" &&
              nvm install 18 &&
              nvm use 18
            `);
            await this.executeSSHCommand(conn, `
              export NVM_DIR="$HOME/.nvm" &&
              [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" &&
              node --version && npm --version
            `);
            this.log('✓ Node.js and npm installed via nvm');
            nodeInstalled = true;
          } catch (nvmError) {
            this.log(`NVM installation failed: ${nvmError instanceof Error ? nvmError.message : 'Unknown error'}`);
          }
        }
        
        if (!nodeInstalled) {
          throw new Error('Failed to install Node.js and npm. Please install them manually on the server.');
        }
      }

      // Install dependencies
      this.log('Installing dependencies...');
      await this.executeSSHCommand(conn, `cd ${this.config.targetPath} && npm install`);
      this.log('✓ Dependencies installed');
      
      // Fix permissions for node_modules binaries
      this.log('Fixing node_modules permissions...');
      try {
        await this.executeSSHCommand(conn, `chmod -R +x ${this.config.targetPath}/node_modules/.bin/ 2>/dev/null || true`);
        await this.executeSSHCommand(conn, `find ${this.config.targetPath}/node_modules/.bin/ -type f -exec chmod +x {} \\; 2>/dev/null || true`);
        this.log('✓ Node modules permissions fixed');
      } catch (permError) {
        this.log(`Warning: Could not fix node_modules permissions: ${permError instanceof Error ? permError.message : 'Unknown error'}`);
      }

      // Build the project
      this.log('Building the project...');
      try {
        await this.executeSSHCommand(conn, `cd ${this.config.targetPath} && npm run build`);
        this.log('✓ Project built successfully');
      } catch (buildError) {
        this.log(`npm run build failed: ${buildError instanceof Error ? buildError.message : 'Unknown error'}`);
        this.log('Trying alternative build method...');
        
        try {
          // Try using npx tsc directly
          await this.executeSSHCommand(conn, `cd ${this.config.targetPath} && npx tsc server-monitor.ts --outDir dist --target es2020 --module commonjs --esModuleInterop --allowSyntheticDefaultImports`);
          this.log('✓ Project built successfully using npx tsc');
        } catch (npxError) {
          this.log(`npx tsc failed: ${npxError instanceof Error ? npxError.message : 'Unknown error'}`);
          this.log('Trying direct tsc command...');
          
          try {
            // Try using tsc directly from node_modules
            await this.executeSSHCommand(conn, `cd ${this.config.targetPath} && ./node_modules/.bin/tsc server-monitor.ts --outDir dist --target es2020 --module commonjs --esModuleInterop --allowSyntheticDefaultImports`);
            this.log('✓ Project built successfully using direct tsc');
          } catch (directTscError) {
            this.log(`Direct tsc failed: ${directTscError instanceof Error ? directTscError.message : 'Unknown error'}`);
            this.log('Skipping build step - project may not require compilation');
          }
        }
      }

        // Install PM2 if needed
        if (this.config.usePM2) {
          this.log('Checking for PM2...');
          try {
            await this.executeSSHCommand(conn, `pm2 --version`);
            this.log('✓ PM2 is already installed');
          } catch (error) {
            this.log('PM2 not found, installing...');
            try {
              await this.executeSSHCommand(conn, `sudo npm install -g pm2`);
              await this.executeSSHCommand(conn, `pm2 --version`);
              this.log('✓ PM2 installed successfully');
            } catch (pm2Error) {
              this.log(`PM2 installation failed: ${pm2Error instanceof Error ? pm2Error.message : 'Unknown error'}`);
              this.log('Continuing without PM2...');
              this.config.usePM2 = false;
            }
          }
          
          // Stop existing process if running
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
