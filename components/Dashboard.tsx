'use client';

import { useState, useEffect } from 'react';
import { DashboardStats, ServerWithStatus } from '@/lib/types';
import StatsCards from './StatsCards';
import ServerTable from './ServerTable';
import AddServerModal from './AddServerModal';
import Header from './Header';

interface DashboardProps {
  onLogout: () => void;
}

export default function Dashboard({ onLogout }: DashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [servers, setServers] = useState<ServerWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchData = async () => {
    try {
      const [statsResponse, serversResponse, monitoringResponse] = await Promise.all([
        fetch('/api/dashboard/stats'),
        fetch('/api/servers'),
        fetch('/api/monitoring/status') // Initialize monitoring service
      ]);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats);
      }

      if (serversResponse.ok) {
        const serversData = await serversResponse.json();
        setServers(serversData.servers);
      }

      if (monitoringResponse.ok) {
        const monitoringData = await monitoringResponse.json();
        console.log('Monitoring service status:', monitoringData.status);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [refreshKey]);

  // Auto-refresh data every 15 seconds to show updated monitoring data
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData();
    }, 15000); // Refresh every 15 seconds

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="ltr">
      <Header onLogout={onLogout} onAddServer={() => setShowAddModal(true)} />
      
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {stats && <StatsCards stats={stats} />}
        
        <div className="mt-8">
          <ServerTable 
            servers={servers}
            onServerUpdated={handleServerUpdated}
            onServerDeleted={handleServerDeleted}
          />
        </div>
      </main>

      {showAddModal && (
        <AddServerModal
          onClose={() => setShowAddModal(false)}
          onServerAdded={handleServerAdded}
        />
      )}
    </div>
  );
}
