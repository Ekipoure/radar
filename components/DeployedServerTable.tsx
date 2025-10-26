'use client';

import { useState, useEffect } from 'react';
import { DeployedServer } from '@/lib/types';
import { formatTableDate, formatHeaderTime } from '@/lib/timezone';

interface DeployedServerTableProps {
  deployedServers: DeployedServer[];
  onDeployedServerUpdated: () => void;
  onDeployedServerDeleted: () => void;
}

export default function DeployedServerTable({ 
  deployedServers, 
  onDeployedServerUpdated, 
  onDeployedServerDeleted 
}: DeployedServerTableProps) {
  const [editingServer, setEditingServer] = useState<DeployedServer | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Lock body scroll when edit modal is open
  useEffect(() => {
    if (showEditModal) {
      // Store the current overflow value
      const originalOverflow = document.body.style.overflow;
      // Lock the body scroll
      document.body.style.overflow = 'hidden';
      
      // Cleanup function to restore scroll when modal closes
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [showEditModal]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'deployed':
        return <span className="status-badge status-up">Deployed</span>;
      case 'deploying':
        return <span className="status-badge status-timeout">Deploying</span>;
      case 'failed':
        return <span className="status-badge status-down">Failed</span>;
      case 'stopped':
        return <span className="status-badge status-error">Stopped</span>;
      default:
        return <span className="status-badge status-unknown">Unknown</span>;
    }
  };

  const handleEdit = (server: DeployedServer) => {
    setEditingServer(server);
    setShowEditModal(true);
  };

  const handleToggleStatus = async (server: DeployedServer) => {
    try {
      const response = await fetch(`/api/deployed-servers/${server.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ is_active: !server.is_active }),
      });

      if (response.ok) {
        onDeployedServerUpdated();
      }
    } catch (error) {
      console.error('Error toggling deployed server status:', error);
    }
  };

  const handleDelete = async (server: DeployedServer) => {
    if (!confirm(`Are you sure you want to delete deployed server "${server.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/deployed-servers/${server.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        onDeployedServerDeleted();
      }
    } catch (error) {
      console.error('Error deleting deployed server:', error);
    }
  };

  const handleServerEdit = () => {
    setShowEditModal(false);
    setEditingServer(null);
    onDeployedServerUpdated();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return formatHeaderTime(date);
  };

  const formatLastChecked = (lastChecked?: string) => {
    if (!lastChecked) return 'Never';
    
    const date = new Date(lastChecked);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return formatTableDate(date);
  };

  return (
    <div className="card">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
          Deployed Servers
        </h3>
        
        <div className="overflow-x-auto -mx-4 sm:mx-0" dir="ltr">
          <table className="min-w-full divide-y divide-gray-200 table-ltr" style={{ minWidth: '800px' }} dir="ltr">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Server IP
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Username
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Repository
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Port
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Deployed At
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Checked
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200" dir="ltr">
              {deployedServers.map((server) => (
                <tr key={server.id} className="hover:bg-gray-50">
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10">
                        <div 
                          className="h-8 w-8 sm:h-10 sm:w-10 rounded-full flex items-center justify-center border-2 border-white shadow-sm bg-blue-500"
                        >
                          <svg className="h-4 w-4 sm:h-5 sm:w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                        </div>
                      </div>
                      <div className="ml-2 sm:ml-4 min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900 truncate">{server.name}</div>
                        <div className="text-sm text-gray-500 truncate">ID: {server.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {server.server_ip}
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {server.username}
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 truncate max-w-xs" title={server.repo_url}>
                      {server.repo_url}
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(server.status)}
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {server.port}
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(server.deployed_at)}
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatLastChecked(server.last_checked)}
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex flex-wrap gap-1 sm:gap-2 justify-start">
                      <button
                        onClick={() => handleEdit(server)}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleStatus(server)}
                        className={`${
                          server.is_active 
                            ? 'text-warning-600 hover:text-warning-900' 
                            : 'text-success-600 hover:text-success-900'
                        }`}
                      >
                        {server.is_active ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        onClick={() => handleDelete(server)}
                        className="text-danger-600 hover:text-danger-900"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal - You can create a separate component for this */}
      {showEditModal && editingServer && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="relative w-full max-w-md bg-white rounded-lg shadow-xl">
            <div className="px-6 py-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Deployed Server</h3>
              <p className="text-sm text-gray-500 mb-4">
                Edit functionality will be implemented in a separate modal component.
              </p>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingServer(null);
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

