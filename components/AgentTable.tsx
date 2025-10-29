'use client';

import { useState, useEffect } from 'react';
import { Agent } from '@/lib/types';
import AddAgentModal from './AddAgentModal';
import { formatTableDate, formatHeaderTime } from '@/lib/timezone';

interface AgentTableProps {
  agents: Agent[];
  onAgentUpdated: () => void;
  onAgentDeleted: () => void;
}

export default function AgentTable({ 
  agents, 
  onAgentUpdated, 
  onAgentDeleted 
}: AgentTableProps) {
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

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

  const handleEdit = (agent: Agent) => {
    setEditingAgent(agent);
    setShowEditModal(true);
  };

  const handleToggleStatus = async (agent: Agent) => {
    try {
      const response = await fetch(`/api/agents/${agent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ is_active: !agent.is_active }),
      });

      if (response.ok) {
        onAgentUpdated();
      }
    } catch (error) {
      console.error('Error toggling agent status:', error);
    }
  };

  const handleDelete = async (agent: Agent) => {
    if (!confirm(`Are you sure you want to delete agent "${agent.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/agents/${agent.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        onAgentDeleted();
      }
    } catch (error) {
      console.error('Error deleting agent:', error);
    }
  };

  const handleAgentEdit = () => {
    setShowEditModal(false);
    setEditingAgent(null);
    onAgentUpdated();
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
          <h3 className="text-base sm:text-lg leading-6 font-medium text-gray-900">
            Agents
          </h3>
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full sm:w-auto bg-blue-600 text-white px-3 py-2 sm:px-4 rounded-md hover:bg-blue-700 transition-colors text-sm sm:text-base"
          >
            افزودن ایجنت جدید
          </button>
        </div>
        
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
              {agents.map((agent) => (
                <tr key={agent.id} className="hover:bg-gray-50">
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10">
                        <div 
                          className="h-8 w-8 sm:h-10 sm:w-10 rounded-full flex items-center justify-center border-2 border-white shadow-sm bg-green-500"
                        >
                          <svg className="h-4 w-4 sm:h-5 sm:w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                      </div>
                      <div className="ml-2 sm:ml-4 min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900 truncate">{agent.name}</div>
                        <div className="text-sm text-gray-500 truncate">ID: {agent.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {agent.server_ip}
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {agent.username}
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 truncate max-w-xs" title={agent.repo_url}>
                      {agent.repo_url}
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(agent.status)}
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {agent.port}
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(agent.deployed_at)}
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatLastChecked(agent.last_checked)}
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex flex-col sm:flex-row flex-wrap gap-1 sm:gap-2 justify-start">
                      <button
                        onClick={() => handleEdit(agent)}
                        className="text-primary-600 hover:text-primary-900 text-xs sm:text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleStatus(agent)}
                        className={`text-xs sm:text-sm ${
                          agent.is_active 
                            ? 'text-warning-600 hover:text-warning-900' 
                            : 'text-success-600 hover:text-success-900'
                        }`}
                      >
                        {agent.is_active ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        onClick={() => handleDelete(agent)}
                        className="text-danger-600 hover:text-danger-900 text-xs sm:text-sm"
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
      {showEditModal && editingAgent && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="relative w-full max-w-md bg-white rounded-lg shadow-xl">
            <div className="px-6 py-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Agent</h3>
              <p className="text-sm text-gray-500 mb-4">
                Edit functionality will be implemented in a separate modal component.
              </p>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingAgent(null);
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

      {showAddModal && (
        <AddAgentModal
          onClose={() => setShowAddModal(false)}
          onAgentAdded={() => {
            setShowAddModal(false);
            onAgentUpdated();
          }}
        />
      )}
    </div>
  );
}
