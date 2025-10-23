'use client';

import { useState, useEffect } from 'react';
import { MonitoringData, ServerWithStatus } from '@/lib/types';

interface ServerChartProps {
  server: ServerWithStatus;
  className?: string;
  timeRange?: number;
}

interface ChartData {
  time: string;
  status: 'up' | 'down' | 'timeout' | 'error' | 'skipped';
  responseTime?: number;
}

const statusColors = {
  up: '#10B981', // green
  down: '#EF4444', // red
  timeout: '#F59E0B', // yellow
  error: '#8B5CF6', // purple
  skipped: '#6B7280' // gray
};

const statusLabels = {
  up: 'آنلاین',
  down: 'آفلاین',
  timeout: 'تایم‌اوت',
  error: 'خطا',
  skipped: 'رد شده'
};

export default function ServerChart({ server, className = '', timeRange = 6 }: ServerChartProps) {
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Update current time every minute
  useEffect(() => {
    // Set initial time on client side only
    setCurrentTime(new Date());
    
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const fetchChartData = async (isRefresh = false) => {
    try {
      // Only show loading on initial load, not on refreshes
      if (!isRefresh) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }
      
      console.log(`Fetching monitoring data for server ${server.id} with ${timeRange} hours`);
      
      // Use API endpoint instead of direct database access
      const response = await fetch(`/api/public/servers/${server.id}/monitoring?hours=${timeRange}`);
      console.log(`Response status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`Received ${data.length} monitoring records for server ${server.id}:`, data);
        
        // Convert to chart data and sort by time
        const chartData: ChartData[] = data
          .map((item: any) => ({
            time: new Date(item.checked_at).toLocaleString('fa-IR', {
              timeZone: 'Asia/Tehran',
              hour: '2-digit',
              minute: '2-digit',
              day: '2-digit',
              month: '2-digit'
            }),
            status: item.status,
            responseTime: item.response_time
          }))
          .sort((a: ChartData, b: ChartData) => new Date(a.time).getTime() - new Date(b.time).getTime())
          .slice(0, 100); // Limit to maximum 100 candles
        
        console.log(`Processed chart data:`, chartData);
        setChartData(chartData);
      } else {
        const errorText = await response.text();
        console.error(`API error: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('Error fetching chart data:', error);
    } finally {
      if (!isRefresh) {
        setLoading(false);
        setIsInitialLoad(false);
      } else {
        setIsRefreshing(false);
      }
    }
  };

  useEffect(() => {
    // Initial load
    fetchChartData();
    
    // Auto-refresh every 30 seconds (silent)
    const interval = setInterval(() => {
      fetchChartData(true);
    }, 30000);
    
    return () => clearInterval(interval);
  }, [server.id, timeRange]);


  const getStatusCounts = () => {
    const counts = chartData.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return counts;
  };

  const getUptimePercentage = () => {
    if (chartData.length === 0) return 0;
    const upCount = chartData.filter(item => item.status === 'up').length;
    return Math.round((upCount / chartData.length) * 100);
  };

  const getAverageResponseTime = () => {
    const responseTimes = chartData
      .filter(item => item.responseTime && item.status === 'up')
      .map(item => item.responseTime!);
    
    if (responseTimes.length === 0) return 0;
    return Math.round(responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length);
  };

  const getMaxResponseTime = () => {
    if (chartData.length === 0) return 100;
    return Math.max(...chartData.map(d => d.responseTime || 0), 100);
  };

  const getBarHeight = (responseTime: number) => {
    const maxHeight = 60; // Maximum height in pixels
    const minHeight = 4;  // Minimum height in pixels
    const maxResponseTime = getMaxResponseTime();
    
    if (responseTime <= 0) return minHeight;
    
    // Use square root scaling for better visual distribution
    // This prevents extremely tall bars while maintaining relative differences
    const normalizedTime = Math.sqrt(responseTime) / Math.sqrt(maxResponseTime);
    const height = minHeight + (normalizedTime * (maxHeight - minHeight));
    
    return Math.max(minHeight, Math.min(maxHeight, height));
  };

  const statusCounts = getStatusCounts();
  const uptime = getUptimePercentage();
  const avgResponseTime = getAverageResponseTime();

  return (
    <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`} dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">{server.name}</h3>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: server.color }}
              ></div>
              {server.ip_address}
            </span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              server.current_status === 'up' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {server.current_status ? statusLabels[server.current_status] : 'نامشخص'}
            </span>
            <span className="text-xs">
              {server.server_group === 'iranian' ? 'داخلی' : 'خارجی'}
            </span>
          </div>
        </div>
        
        
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-gray-900">{uptime}%</div>
          <div className="text-xs text-gray-600">آپتایم</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-gray-900">{avgResponseTime}ms</div>
          <div className="text-xs text-gray-600">میانگین پاسخ</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-gray-900">{chartData.length}</div>
          <div className="text-xs text-gray-600">تعداد چک</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-gray-900" suppressHydrationWarning>
            {server.last_checked ? 
              new Date(server.last_checked).toLocaleString('fa-IR', {
                timeZone: 'Asia/Tehran',
                hour: '2-digit',
                minute: '2-digit'
              }) : 'نامشخص'
            }
          </div>
          <div className="text-xs text-gray-600">آخرین چک</div>
        </div>
      </div>

      {/* Chart */}
      <div className="relative">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-500">
            داده‌ای برای نمایش وجود ندارد
          </div>
        ) : (
          <div className="space-y-2 transition-all duration-300 ease-in-out">
            {/* Chart Bars */}
            <div className="flex items-end gap-1 h-20">
              {chartData.map((item, index) => (
                <div
                  key={`${item.time}-${index}`}
                  className="flex-1 rounded-t transition-all duration-500 ease-in-out"
                  style={{
                    height: `${getBarHeight(item.responseTime || 0)}px`,
                    backgroundColor: statusColors[item.status],
                    opacity: 0.8
                  }}
                  title={`${item.time} - ${statusLabels[item.status]} - ${item.responseTime || 0}ms`}
                />
              ))}
            </div>
            
            {/* Time Labels */}
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span suppressHydrationWarning>{chartData[0]?.time}</span>
              <span suppressHydrationWarning>{chartData[chartData.length - 1]?.time}</span>
            </div>
          </div>
        )}
      </div>

      {/* Status Legend */}
      <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-200">
        {Object.entries(statusLabels).map(([status, label]) => (
          <div key={status} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: statusColors[status as keyof typeof statusColors] }}
            ></div>
            <span className="text-sm text-gray-600">{label}</span>
            <span className="text-sm font-medium text-gray-900">
              ({statusCounts[status] || 0})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
