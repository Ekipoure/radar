'use client';

import { useState } from 'react';
import { ServerWithStatus } from '@/lib/types';
import EditServerModal from './EditServerModal';
import ServerChartModal from './ServerChartModal';

interface ServerTableProps {
  servers: ServerWithStatus[];
  onServerUpdated: () => void;
  onServerDeleted: () => void;
}

export default function ServerTable({ servers, onServerUpdated, onServerDeleted }: ServerTableProps) {
  const [editingServer, setEditingServer] = useState<ServerWithStatus | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [chartServer, setChartServer] = useState<ServerWithStatus | null>(null);
  const [showChartModal, setShowChartModal] = useState(false);

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'up':
        return <span className="status-badge status-up">Online</span>;
      case 'down':
        return <span className="status-badge status-down">Offline</span>;
      case 'timeout':
        return <span className="status-badge status-timeout">Timeout</span>;
      case 'error':
        return <span className="status-badge status-error">Error</span>;
      case 'skipped':
        return <span className="status-badge status-skipped">Skipped</span>;
      default:
        return <span className="status-badge status-unknown">Unknown</span>;
    }
  };

  const getRequestTypeIcon = (type: string) => {
    switch (type) {
      case 'ping':
        return (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
      case 'http':
        return (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
          </svg>
        );
      case 'https':
        return (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        );
      case 'tcp':
        return (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const handleEdit = (server: ServerWithStatus) => {
    setEditingServer(server);
    setShowEditModal(true);
  };

  const handleToggleStatus = async (server: ServerWithStatus) => {
    try {
      const response = await fetch(`/api/servers/${server.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: !server.is_active }),
      });

      if (response.ok) {
        onServerUpdated();
      }
    } catch (error) {
      console.error('Error toggling server status:', error);
    }
  };

  const handleDelete = async (server: ServerWithStatus) => {
    if (!confirm(`Are you sure you want to delete server "${server.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/servers/${server.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onServerDeleted();
      }
    } catch (error) {
      console.error('Error deleting server:', error);
    }
  };

  const handleServerEdit = () => {
    setShowEditModal(false);
    setEditingServer(null);
    onServerUpdated();
  };

  const handleShowChart = (server: ServerWithStatus) => {
    setChartServer(server);
    setShowChartModal(true);
  };

  const formatLastChecked = (lastChecked?: string) => {
    if (!lastChecked) return 'Never';
    
    const date = new Date(lastChecked);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString('fa-IR', { timeZone: 'Asia/Tehran' });
  };

  return (
    <div className="card">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
          Server Status
        </h3>
        
        <div className="overflow-x-auto -mx-4 sm:mx-0" dir="ltr">
          <table className="min-w-full divide-y divide-gray-200 table-ltr" style={{ minWidth: '800px' }} dir="ltr">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Server
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Response Time
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Checked
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Group
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200" dir="ltr">
              {servers.map((server) => (
                <tr key={server.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleShowChart(server)}>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10">
                        <div 
                          className="h-8 w-8 sm:h-10 sm:w-10 rounded-full flex items-center justify-center border-2 border-white shadow-sm"
                          style={{ backgroundColor: server.color }}
                        >
                          <svg className="h-4 w-4 sm:h-5 sm:w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
                          </svg>
                        </div>
                      </div>
                      <div className="ml-2 sm:ml-4 min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900 truncate">{server.name}</div>
                        <div className="text-sm text-gray-500 truncate">{server.ip_address}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 mr-2">
                        {getRequestTypeIcon(server.request_type)}
                      </div>
                      <span className="text-sm text-gray-900 uppercase">{server.request_type}</span>
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(server.current_status)}
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {server.response_time ? `${server.response_time}ms` : '-'}
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatLastChecked(server.last_checked)}
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      server.server_group === 'iranian' 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-indigo-100 text-indigo-800'
                    }`}>
                      {server.server_group}
                    </span>
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex flex-wrap gap-1 sm:gap-2 justify-start" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleShowChart(server)}
                        className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                        title="View Chart"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <span className="hidden sm:inline">Chart</span>
                      </button>
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

      {showEditModal && editingServer && (
        <EditServerModal
          server={editingServer}
          onClose={() => {
            setShowEditModal(false);
            setEditingServer(null);
          }}
          onServerUpdated={handleServerEdit}
        />
      )}

      {showChartModal && chartServer && (
        <ServerChartModal
          server={chartServer}
          isOpen={showChartModal}
          onClose={() => {
            setShowChartModal(false);
            setChartServer(null);
          }}
        />
      )}
    </div>
  );
}
