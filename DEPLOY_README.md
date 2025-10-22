# 🚀 Next.js Deployment Agent

A powerful deployment automation agent for Next.js projects that uses SSH to connect to remote servers and deploy applications automatically.

## ✨ Features

- **SSH Connection**: Secure connection to remote servers using SSH2
- **Git Integration**: Clone or pull repositories automatically
- **Environment Management**: Upload and manage .env files
- **Dependency Installation**: Automatic npm install
- **Build & Deploy**: Build and start Next.js applications
- **Process Management**: Optional PM2 integration for process management
- **Real-time Logging**: Detailed logs for all deployment steps
- **Error Handling**: Graceful error handling with detailed error messages
- **Web Interface**: Beautiful dashboard integration for easy deployment

## 🛠️ Installation

The deployment agent is already integrated into this radar monitoring project. To use it:

1. **Install Dependencies** (already done):
   ```bash
   npm install ssh2 @types/ssh2
   ```

2. **Access the Dashboard**:
   - Start the development server: `npm run dev`
   - Navigate to `http://localhost:3000/dashboard`
   - Click the "Deploy" button in the header

## 🎯 Usage

### Web Interface (Recommended)

1. Open the dashboard at `http://localhost:3000/dashboard`
2. Click the "Deploy" button in the header
3. Fill in the deployment form:
   - **Server IP**: Your remote server's IP address
   - **Username**: SSH username (usually 'root' or your user)
   - **Password**: SSH password
   - **Repository URL**: Git repository URL (HTTPS or SSH)
   - **Target Path**: Directory on server (default: `/var/www/project`)
   - **Environment Variables**: Paste your .env content
   - **Use PM2**: Check to use PM2 for process management
4. Click "Deploy" and watch the real-time logs

### Programmatic Usage

```typescript
import { DeployAgent, DeployConfig } from './lib/deployAgent';

const config: DeployConfig = {
  serverIp: '192.168.1.100',
  username: 'root',
  password: 'your-password',
  repoUrl: 'https://github.com/username/repository.git',
  envContent: 'NODE_ENV=production\nDATABASE_URL=...',
  targetPath: '/var/www/project',
  usePM2: true
};

const agent = new DeployAgent(config);
const result = await agent.deploy();

if (result.success) {
  console.log('✅ Deployment successful!');
} else {
  console.error('❌ Deployment failed:', result.error);
}
```

### CLI Usage

```bash
# Run the CLI interface
npx tsx lib/deployAgent.ts

# Or run the example
npx tsx exampleDeploy.ts
```

## 📋 Requirements

### Remote Server Requirements

Your remote server must have:

- **Node.js** (v14 or higher)
- **npm** or **yarn**
- **Git** installed
- **SSH access** enabled
- **Write permissions** to the target directory
- **PM2** (optional, for process management)

### Local Requirements

- Node.js v14+
- SSH2 library (already installed)
- Access to the remote server via SSH

## 🔧 Configuration Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `serverIp` | string | ✅ | Remote server IP address |
| `username` | string | ✅ | SSH username |
| `password` | string | ✅ | SSH password |
| `repoUrl` | string | ✅ | Git repository URL |
| `envContent` | string | ✅ | Environment variables content |
| `envFilePath` | string | ❌ | Path to .env file (alternative to envContent) |
| `targetPath` | string | ❌ | Target directory on server (default: `/var/www/project`) |
| `usePM2` | boolean | ❌ | Use PM2 for process management (default: true) |

## 🚀 Deployment Process

The agent performs the following steps:

1. **Connect** to the remote server via SSH
2. **Create** target directory if it doesn't exist
3. **Clone/Pull** the repository
4. **Upload** the .env file
5. **Install** dependencies (`npm install`)
6. **Build** the project (`npm run build`)
7. **Stop** existing processes (if using PM2)
8. **Start** the application
9. **Save** PM2 configuration (if using PM2)

## 📊 Monitoring & Logs

- **Real-time Logs**: All deployment steps are logged in real-time
- **Error Handling**: Detailed error messages for troubleshooting
- **Status Updates**: Clear success/failure indicators
- **Log History**: Complete deployment history in the dashboard

## 🔒 Security Considerations

- **SSH Keys**: Consider using SSH keys instead of passwords for better security
- **Environment Variables**: Never commit sensitive .env files to version control
- **Server Access**: Ensure only authorized users have access to the deployment interface
- **Network Security**: Use VPN or secure networks for deployment

## 🐛 Troubleshooting

### Common Issues

1. **Connection Failed**
   - Check server IP and credentials
   - Ensure SSH is enabled on the server
   - Verify network connectivity

2. **Permission Denied**
   - Check if the user has write permissions to the target directory
   - Ensure the user can run npm commands

3. **Build Failed**
   - Check if all dependencies are properly installed
   - Verify the project builds locally first
   - Check for missing environment variables

4. **PM2 Not Found**
   - Install PM2 globally: `npm install -g pm2`
   - Or disable PM2 by setting `usePM2: false`

### Debug Mode

Enable detailed logging by checking the browser console or server logs for more information.

## 📁 File Structure

```
lib/
├── deployAgent.ts          # Core deployment logic
└── types.ts               # TypeScript type definitions

app/api/deploy/
└── route.ts               # API endpoint for web interface

components/
└── DeployModal.tsx        # Web interface component

exampleDeploy.ts           # Example usage
DEPLOY_README.md          # This documentation
```

## 🤝 Contributing

To contribute to the deployment agent:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This deployment agent is part of the Radar monitoring project and follows the same license terms.

## 🆘 Support

For support or questions:

1. Check the troubleshooting section above
2. Review the logs for error details
3. Open an issue in the repository
4. Contact the development team

---

**Happy Deploying! 🚀**
