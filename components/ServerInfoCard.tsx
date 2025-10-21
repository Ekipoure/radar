'use client';

import { useState, useEffect } from 'react';
import { ServerWithStatus } from '@/lib/types';

interface ServerInfoCardProps {
  server: ServerWithStatus;
  className?: string;
}

interface ServerStats {
  uptime: number;
  averageResponseTime: number;
  totalChecks: number;
  lastCheckTime: string;
  statusCounts: Record<string, number>;
}

const statusColors = {
  up: '#10B981',
  down: '#EF4444',
  timeout: '#F59E0B',
  error: '#8B5CF6',
  skipped: '#6B7280'
};

const statusLabels = {
  up: 'آنلاین',
  down: 'آفلاین',
  timeout: 'تایم‌اوت',
  error: 'خطا',
  skipped: 'رد شده'
};

export default function ServerInfoCard({ server, className = '' }: ServerInfoCardProps) {
  const [stats, setStats] = useState<ServerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    const fetchStats = async (isRefresh = false) => {
      try {
        // Only show loading on initial load, not on refreshes
        if (!isRefresh) {
          setLoading(true);
        }
        
        const response = await fetch(`/api/public/servers/${server.id}/monitoring?hours=24`);
        if (response.ok) {
          const data = await response.json();
          
          // Calculate stats
          const totalChecks = data.length;
          const upCount = data.filter((item: any) => item.status === 'up').length;
          const uptime = totalChecks > 0 ? Math.round((upCount / totalChecks) * 100) : 0;
          
          const responseTimes = data
            .filter((item: any) => item.response_time && item.status === 'up')
            .map((item: any) => item.response_time);
          const averageResponseTime = responseTimes.length > 0 
            ? Math.round(responseTimes.reduce((sum: number, time: number) => sum + time, 0) / responseTimes.length)
            : 0;

          const statusCounts = data.reduce((acc: Record<string, number>, item: any) => {
            acc[item.status] = (acc[item.status] || 0) + 1;
            return acc;
          }, {});

          const lastCheckTime = data.length > 0 
            ? new Date(data[0].checked_at).toLocaleString('fa-IR', {
                timeZone: 'Asia/Tehran',
                hour: '2-digit',
                minute: '2-digit',
                day: '2-digit',
                month: '2-digit'
              })
            : 'نامشخص';

          setStats({
            uptime,
            averageResponseTime,
            totalChecks,
            lastCheckTime,
            statusCounts
          });
        }
      } catch (error) {
        console.error('Error fetching server stats:', error);
      } finally {
        if (!isRefresh) {
          setLoading(false);
          setIsInitialLoad(false);
        }
      }
    };

    // Initial load
    fetchStats();
    
    // Auto-refresh every 30 seconds (silent)
    const interval = setInterval(() => {
      fetchStats(true);
    }, 30000);
    
    return () => clearInterval(interval);
  }, [server.id]);

  // Force refresh when server data changes
  useEffect(() => {
    if (!isInitialLoad && stats) {
      const fetchStats = async () => {
        try {
          const response = await fetch(`/api/public/servers/${server.id}/monitoring?hours=24`);
          if (response.ok) {
            const data = await response.json();
            
            // Calculate stats
            const totalChecks = data.length;
            const upCount = data.filter((item: any) => item.status === 'up').length;
            const uptime = totalChecks > 0 ? Math.round((upCount / totalChecks) * 100) : 0;
            
            const responseTimes = data
              .filter((item: any) => item.response_time && item.status === 'up')
              .map((item: any) => item.response_time);
            const averageResponseTime = responseTimes.length > 0 
              ? Math.round(responseTimes.reduce((sum: number, time: number) => sum + time, 0) / responseTimes.length)
              : 0;

            const statusCounts = data.reduce((acc: Record<string, number>, item: any) => {
              acc[item.status] = (acc[item.status] || 0) + 1;
              return acc;
            }, {});

            const lastCheckTime = data.length > 0 
              ? new Date(data[0].checked_at).toLocaleString('fa-IR', {
                  timeZone: 'Asia/Tehran',
                  hour: '2-digit',
                  minute: '2-digit',
                  day: '2-digit',
                  month: '2-digit'
                })
              : 'نامشخص';

            setStats({
              uptime,
              averageResponseTime,
              totalChecks,
              lastCheckTime,
              statusCounts
            });
          }
        } catch (error) {
          console.error('Error refreshing server stats:', error);
        }
      };
      
      fetchStats();
    }
  }, [server.current_status, server.response_time, server.last_checked]);

  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`} dir="rtl">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
            <div className="h-3 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`} dir="rtl">
        <div className="text-center text-gray-500">
          خطا در بارگذاری اطلاعات
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 ease-in-out ${className}`} dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div 
            className="w-4 h-4 rounded-full" 
            style={{ backgroundColor: server.color }}
          ></div>
          <h3 className="text-lg font-bold text-gray-900">{server.name}</h3>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
          server.current_status === 'up' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {server.current_status ? statusLabels[server.current_status] : 'نامشخص'}
        </div>
      </div>

      {/* Server Details */}
      <div className="mb-4 text-sm text-gray-600">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium">آدرس:</span>
          <span>{server.ip_address}</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium">نوع:</span>
          <span className="capitalize">{server.request_type}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium">گروه:</span>
          <span className={`px-2 py-1 rounded text-xs ${
            server.server_group === 'iranian' 
              ? 'bg-blue-100 text-blue-800' 
              : 'bg-purple-100 text-purple-800'
          }`}>
            {server.server_group === 'iranian' ? 'داخلی' : 'خارجی'}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center transition-all duration-300 ease-in-out">
          <div className="text-2xl font-bold text-gray-900 transition-all duration-500 ease-in-out">{stats.uptime}%</div>
          <div className="text-xs text-gray-600">آپتایم</div>
        </div>
        <div className="text-center transition-all duration-300 ease-in-out">
          <div className="text-2xl font-bold text-gray-900 transition-all duration-500 ease-in-out">{stats.averageResponseTime}ms</div>
          <div className="text-xs text-gray-600">میانگین پاسخ</div>
        </div>
        <div className="text-center transition-all duration-300 ease-in-out">
          <div className="text-2xl font-bold text-gray-900 transition-all duration-500 ease-in-out">{stats.totalChecks}</div>
          <div className="text-xs text-gray-600">تعداد چک</div>
        </div>
        <div className="text-center transition-all duration-300 ease-in-out">
          <div className="text-lg font-bold text-gray-900 transition-all duration-500 ease-in-out">
            {server.response_time ? `${server.response_time}ms` : 'نامشخص'}
          </div>
          <div className="text-xs text-gray-600">آخرین پاسخ</div>
        </div>
      </div>

      {/* Status Distribution */}
      <div className="space-y-2">
        <div className="text-sm font-medium text-gray-700">توزیع وضعیت (24 ساعت گذشته):</div>
        <div className="space-y-1">
          {Object.entries(statusLabels).map(([status, label]) => {
            const count = stats.statusCounts[status] || 0;
            const percentage = stats.totalChecks > 0 ? Math.round((count / stats.totalChecks) * 100) : 0;
            
            return (
              <div key={status} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: statusColors[status as keyof typeof statusColors] }}
                  ></div>
                  <span className="text-gray-600">{label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-900 font-medium">{count}</span>
                  <span className="text-gray-500">({percentage}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Last Check Time */}
      <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500 text-center">
        آخرین بررسی: {stats.lastCheckTime}
      </div>
    </div>
  );
}
