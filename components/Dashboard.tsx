'use client';

import { useState, useEffect } from 'react';
import { DashboardStats, ServerWithStatus, DeployedServer, Agent } from '@/lib/types';
import StatsCards from './StatsCards';
import ServerTable from './ServerTable';
import DeployedServerTable from './DeployedServerTable';
import AgentTable from './AgentTable';
import AddServerModal from './AddServerModal';
import DeployModal from './DeployModal';
import AddAdModal from './AddAdModal';
import AdTable from './AdTable';
import BannerTable from './BannerTable';
import Header from './Header';

interface DashboardProps {
  onLogout: () => void;
  dateTimeFilter?: { date: string; timeRange: string } | null;
}

export default function Dashboard({ onLogout, dateTimeFilter = null }: DashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [servers, setServers] = useState<ServerWithStatus[]>([]);
  const [deployedServers, setDeployedServers] = useState<DeployedServer[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [showAddAdModal, setShowAddAdModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTable, setActiveTable] = useState<'servers' | 'agents' | 'ads' | 'banners'>('servers');

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : undefined;

      const [statsResponse, serversResponse, agentsResponse] = await Promise.all([
        fetch('/api/dashboard/stats', { headers }),
        fetch('/api/servers', { headers }),
        fetch('/api/agents', { headers })
      ]);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats);
      }

      if (serversResponse.ok) {
        const serversData = await serversResponse.json();
        setServers(serversData.servers);
      }

      if (agentsResponse.ok) {
        const agentsData = await agentsResponse.json();
        setAgents(agentsData.agents);
      }

      setDeployedServers([]); // Not used in this version
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [refreshKey]);

  // Auto-refresh data every 30 seconds to show updated monitoring data (reduced frequency for better performance)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const handleServerAdded = () => {
    setShowAddModal(false);
    setRefreshKey(prev => prev + 1);
  };

  const handleServerUpdated = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleServerDeleted = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleDeploy = () => {
    setShowDeployModal(true);
  };

  const handleDeployedServerUpdated = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleDeployedServerDeleted = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleAddAd = () => {
    setShowAddAdModal(true);
  };

  const handleAdAdded = () => {
    setShowAddAdModal(false);
    setRefreshKey(prev => prev + 1);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="ltr">
      <Header onLogout={onLogout} onAddServer={() => setShowAddModal(true)} onDeploy={handleDeploy} onAddAd={handleAddAd} />
      
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {stats && <StatsCards stats={stats} />}
        
        <div className="mt-8">
          {/* Table Toggle Buttons */}
          <div className="mb-6">
            <div className="flex space-x-4">
              <button
                onClick={() => setActiveTable('servers')}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  activeTable === 'servers'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                سرورها
              </button>
              <button
                onClick={() => setActiveTable('agents')}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  activeTable === 'agents'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                ایجنت‌ها
              </button>
              <button
                onClick={() => setActiveTable('ads')}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  activeTable === 'ads'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                تبلیغات
              </button>
              <button
                onClick={() => setActiveTable('banners')}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  activeTable === 'banners'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                بنرها
              </button>
            </div>
          </div>

          {/* Conditional Table Rendering */}
          {activeTable === 'servers' && (
            <ServerTable 
              servers={servers}
              onServerUpdated={handleServerUpdated}
              onServerDeleted={handleServerDeleted}
              dateTimeFilter={dateTimeFilter}
            />
          )}
          
          {activeTable === 'agents' && (
            <AgentTable 
              agents={agents}
              onAgentUpdated={handleDeployedServerUpdated}
              onAgentDeleted={handleDeployedServerDeleted}
            />
          )}

          {activeTable === 'ads' && (
            <AdTable 
              onAdUpdated={handleAdAdded}
              onAdDeleted={handleAdAdded}
            />
          )}

          {activeTable === 'banners' && (
            <BannerTable 
              onBannerUpdated={() => setRefreshKey(prev => prev + 1)}
              onBannerDeleted={() => setRefreshKey(prev => prev + 1)}
            />
          )}
        </div>
      </main>

      {showAddModal && (
        <AddServerModal
          onClose={() => setShowAddModal(false)}
          onServerAdded={handleServerAdded}
        />
      )}

      {showDeployModal && (
        <DeployModal
          isOpen={showDeployModal}
          onClose={() => setShowDeployModal(false)}
        />
      )}

      {showAddAdModal && (
        <AddAdModal
          onClose={() => setShowAddAdModal(false)}
          onAdAdded={handleAdAdded}
        />
      )}
    </div>
  );
}
