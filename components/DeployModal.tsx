'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon, CloudArrowUpIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface DeployModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DeployConfig {
  agentName: string;
  serverIp: string;
  username: string;
  password: string;
  repoUrl: string;
  envContent: string;
  targetPath: string;
  usePM2: boolean;
  deploymentMode: 'git' | 'upload';
  uploadedFile?: File;
}

interface DeployResult {
  success: boolean;
  message: string;
  logs: string[];
  error?: string;
}

export default function DeployModal({ isOpen, onClose }: DeployModalProps) {
  const [config, setConfig] = useState<DeployConfig>({
    agentName: '',
    serverIp: '',
    username: '',
    password: '',
    repoUrl: '',
    envContent: '',
    targetPath: '/var/www/project',
    usePM2: true,
    deploymentMode: 'git'
  });

  const [isDeploying, setIsDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState<DeployResult | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [deployProgress, setDeployProgress] = useState<string>('');

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      // Store the current overflow value
      const originalOverflow = document.body.style.overflow;
      // Lock the body scroll
      document.body.style.overflow = 'hidden';
      
      // Cleanup function to restore scroll when modal closes
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  const handleInputChange = (field: keyof DeployConfig, value: string | boolean | File) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDeploy = async () => {
    setIsDeploying(true);
    setDeployResult(null);
    setShowLogs(false);
    setDeployProgress('Starting deployment...');

    try {
      // Show progress updates
      setDeployProgress('Validating configuration...');
      
      // Basic client-side validation
      if (!config.agentName || !config.serverIp || !config.username || !config.password) {
        throw new Error('Please fill in all required fields');
      }

      // Validate based on deployment mode
      if (config.deploymentMode === 'git' && !config.repoUrl) {
        throw new Error('Repository URL is required for Git deployment');
      }
      
      if (config.deploymentMode === 'upload' && !config.uploadedFile) {
        throw new Error('Please select a ZIP file for upload deployment');
      }

      // Check if it's a localhost IP (common mistake)
      if (config.serverIp === 'localhost' || config.serverIp === '127.0.0.1') {
        throw new Error('Please use the actual server IP address, not localhost');
      }

      setDeployProgress('Preparing deployment data...');
      
      // Get authentication token
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {};
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      let response: Response;

      if (config.deploymentMode === 'upload' && config.uploadedFile) {
        // Handle file upload
        setDeployProgress('Uploading file...');
        
        const formData = new FormData();
        formData.append('agentName', config.agentName);
        formData.append('serverIp', config.serverIp);
        formData.append('username', config.username);
        formData.append('password', config.password);
        formData.append('envContent', config.envContent);
        formData.append('targetPath', config.targetPath);
        formData.append('usePM2', config.usePM2.toString());
        formData.append('deploymentMode', config.deploymentMode);
        formData.append('file', config.uploadedFile);

        response = await fetch('/api/deploy', {
          method: 'POST',
          headers,
          body: formData,
        });
      } else {
        // Handle git deployment
        setDeployProgress('Connecting to server...');
        
        headers['Content-Type'] = 'application/json';
        
        response = await fetch('/api/deploy', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            ...config,
            deploymentMode: config.deploymentMode
          }),
        });
      }

      setDeployProgress('Processing deployment...');
      
      const result = await response.json();
      setDeployResult(result);
      setShowLogs(true);
      setDeployProgress('');
    } catch (error) {
      setDeployResult({
        success: false,
        message: 'Failed to start deployment',
        logs: [`[ERROR] ${error instanceof Error ? error.message : 'Unknown error'}`],
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      setShowLogs(true);
      setDeployProgress('');
    } finally {
      setIsDeploying(false);
    }
  };

  const handleClose = () => {
    setConfig({
      agentName: '',
      serverIp: '',
      username: '',
      password: '',
      repoUrl: '',
      envContent: '',
      targetPath: '/var/www/project',
      usePM2: true,
      deploymentMode: 'git'
    });
    setDeployResult(null);
    setShowLogs(false);
    setDeployProgress('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <CloudArrowUpIcon className="h-6 w-6 text-blue-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Deploy Agent</h3>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="px-6 py-6 space-y-6">
          {/* Agent Configuration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Agent Name *
            </label>
            <input
              type="text"
              value={config.agentName}
              onChange={(e) => handleInputChange('agentName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="My Production Agent"
              disabled={isDeploying}
            />
            <p className="text-xs text-gray-500 mt-1">
              A unique name to identify this agent
            </p>
          </div>

          {/* Server Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Server IP Address
              </label>
              <input
                type="text"
                value={config.serverIp}
                onChange={(e) => handleInputChange('serverIp', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="192.168.1.100 or your-server.com"
                disabled={isDeploying}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                type="text"
                value={config.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="root"
                disabled={isDeploying}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={config.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
                disabled={isDeploying}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Path
              </label>
              <input
                type="text"
                value={config.targetPath}
                onChange={(e) => handleInputChange('targetPath', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="/var/www/project"
                disabled={isDeploying}
              />
            </div>
          </div>

          {/* Deployment Mode Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Deployment Method
            </label>
            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="radio"
                  id="git-mode"
                  name="deploymentMode"
                  value="git"
                  checked={config.deploymentMode === 'git'}
                  onChange={(e) => handleInputChange('deploymentMode', e.target.value)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  disabled={isDeploying}
                />
                <label htmlFor="git-mode" className="ml-2 block text-sm text-gray-700">
                  Clone from GitHub Repository
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="radio"
                  id="upload-mode"
                  name="deploymentMode"
                  value="upload"
                  checked={config.deploymentMode === 'upload'}
                  onChange={(e) => handleInputChange('deploymentMode', e.target.value)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  disabled={isDeploying}
                />
                <label htmlFor="upload-mode" className="ml-2 block text-sm text-gray-700">
                  Upload Project ZIP File
                </label>
              </div>
            </div>
          </div>

          {/* Repository URL - Only show when git mode is selected */}
          {config.deploymentMode === 'git' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Repository URL
              </label>
              <input
                type="url"
                value={config.repoUrl}
                onChange={(e) => handleInputChange('repoUrl', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://github.com/username/repository.git"
                disabled={isDeploying}
              />
            </div>
          )}

          {/* File Upload - Only show when upload mode is selected */}
          {config.deploymentMode === 'upload' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project ZIP File
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400 transition-colors">
                <div className="space-y-1 text-center">
                  <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                    >
                      <span>Upload a file</span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        accept=".zip"
                        className="sr-only"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleInputChange('uploadedFile', file);
                          }
                        }}
                        disabled={isDeploying}
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">ZIP files only</p>
                  {config.uploadedFile && (
                    <p className="text-sm text-green-600 font-medium">
                      Selected: {config.uploadedFile.name}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Environment Variables */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Environment Variables (.env content) <span className="text-gray-500 text-sm">(Optional)</span>
            </label>
            <textarea
              value={config.envContent}
              onChange={(e) => handleInputChange('envContent', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={6}
              placeholder="NODE_ENV=production&#10;DATABASE_URL=postgresql://...&#10;API_KEY=your-api-key"
              disabled={isDeploying}
            />
          </div>

          {/* PM2 Option */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="usePM2"
              checked={config.usePM2}
              onChange={(e) => handleInputChange('usePM2', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              disabled={isDeploying}
            />
            <label htmlFor="usePM2" className="ml-2 block text-sm text-gray-700">
              Use PM2 for process management (recommended)
            </label>
          </div>

          {/* Help Text */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">💡 Deployment Tips</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Make sure your server has Node.js, npm, and Git installed</li>
              <li>• Ensure SSH access is enabled and credentials are correct</li>
              <li>• The target directory will be created if it doesn't exist</li>
              <li>• PM2 will keep your app running after deployment</li>
              <li>• Check the logs below for detailed progress information</li>
            </ul>
          </div>

          {/* Deploy Button */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              disabled={isDeploying}
            >
              Cancel
            </button>
            <button
              onClick={handleDeploy}
              disabled={isDeploying || !config.agentName || !config.serverIp || !config.username || !config.password || (config.deploymentMode === 'git' && !config.repoUrl) || (config.deploymentMode === 'upload' && !config.uploadedFile)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isDeploying ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Deploying...
                </>
              ) : (
                <>
                  <CloudArrowUpIcon className="h-4 w-4 mr-2" />
                  Deploy
                </>
              )}
            </button>
          </div>

          {/* Progress Indicator */}
          {isDeploying && deployProgress && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                <span className="text-sm text-blue-800">{deployProgress}</span>
              </div>
            </div>
          )}

          {/* Deployment Result */}
          {deployResult && (
            <div className="mt-6">
              <div className={`p-4 rounded-md ${
                deployResult.success 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-center">
                  {deployResult.success ? (
                    <CheckCircleIcon className="h-5 w-5 text-green-400 mr-2" />
                  ) : (
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
                  )}
                  <h4 className={`text-sm font-medium ${
                    deployResult.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {deployResult.success ? 'Deployment Successful' : 'Deployment Failed'}
                  </h4>
                </div>
                <p className={`mt-2 text-sm ${
                  deployResult.success ? 'text-green-700' : 'text-red-700'
                }`}>
                  {deployResult.message}
                </p>
                {deployResult.error && (
                  <p className="mt-2 text-sm text-red-600 font-mono">
                    Error: {deployResult.error}
                  </p>
                )}
              </div>

              {/* Logs Toggle */}
              <button
                onClick={() => setShowLogs(!showLogs)}
                className="mt-3 text-sm text-blue-600 hover:text-blue-800 underline"
              >
                {showLogs ? 'Hide' : 'Show'} deployment logs
              </button>

              {/* Logs Display */}
              {showLogs && (
                <div className="mt-3 bg-gray-900 text-green-400 p-4 rounded-md font-mono text-xs overflow-x-auto max-h-64 overflow-y-auto">
                  {(deployResult.logs || []).map((log, index) => (
                    <div key={index} className="mb-1">
                      {log}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
