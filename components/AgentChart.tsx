'use client';

import { useState, useEffect } from 'react';
import { MonitoringData } from '@/lib/types';

interface AgentChartProps {
  agent: {
    id: number;
    name: string;
    server_ip: string;
    status: string;
    deployed_at: string;
    last_checked?: string;
    port: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  };
  className?: string;
  timeRange?: number;
  selectedServers?: number[];
}

interface ChartData {
  time: string;
  status: 'up' | 'down' | 'timeout' | 'error' | 'skipped';
  responseTime?: number;
  serverName: string;
  serverColor: string;
  errorMessage?: string;
  serverId?: number;
}

interface DestinationServer {
  id: number;
  name: string;
  color: string;
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

export default function AgentChart({ agent, className = '', timeRange = 6, selectedServers = [] }: AgentChartProps) {
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [allChartData, setAllChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<ChartData | null>(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });

  // Update current time every minute
  useEffect(() => {
    setCurrentTime(new Date());
    
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Apply server filter to chart data
  const applyServerFilter = (data: ChartData[]) => {
    if (selectedServers.length === 0) {
      setChartData([]);
      return;
    }
    
    const filteredData = data.filter(item => 
      item.serverId && selectedServers.includes(item.serverId)
    );
    setChartData(filteredData);
  };

  const fetchChartData = async (isRefresh = false) => {
    try {
      if (!isRefresh) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }
      
      console.log(`Fetching monitoring data for agent ${agent.name} (${agent.server_ip}) with ${timeRange} hours`);
      
      // Use API endpoint instead of direct database access
      const response = await fetch(`/api/agents/monitoring?source_ip=${agent.server_ip}&hours=${timeRange}`);
      console.log(`Response status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`Received ${data.monitoringData.length} monitoring records for agent ${agent.name}:`, data);
        
        // Convert to chart data, show ALL data (not just disruptions), and sort by time
        const allData: ChartData[] = data.monitoringData
          .map((item: any) => ({
            time: new Date(item.checked_at).toLocaleString('fa-IR', {
              timeZone: 'Asia/Tehran',
              hour: '2-digit',
              minute: '2-digit',
              day: '2-digit',
              month: '2-digit'
            }),
            status: item.status,
            responseTime: item.response_time,
            serverName: item.server_name,
            serverColor: item.server_color,
            errorMessage: item.error_message,
            serverId: item.server_id // Add server ID for filtering
          }))
          .sort((a: ChartData, b: ChartData) => new Date(a.time).getTime() - new Date(b.time).getTime())
          .slice(0, 100); // Limit to maximum 100 candles
        
        console.log(`Processed chart data:`, allData);
        setAllChartData(allData);
        
        // Apply server filter
        applyServerFilter(allData);
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
  }, [agent.server_ip, timeRange]);

  // Apply filter when selected servers change
  useEffect(() => {
    if (allChartData.length > 0) {
      applyServerFilter(allChartData);
    }
  }, [selectedServers, allChartData]);


  const getStatusCounts = () => {
    const counts = chartData.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return counts;
  };

  const getUptimePercentage = () => {
    if (allChartData.length === 0) return 0;
    const upCount = allChartData.filter(item => item.status === 'up').length;
    return Math.round((upCount / allChartData.length) * 100);
  };

  const getDisruptionCount = () => {
    return allChartData.filter(item => item.status !== 'up').length;
  };

  const getAverageResponseTime = () => {
    const responseTimes = allChartData
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
    const normalizedTime = Math.sqrt(responseTime) / Math.sqrt(maxResponseTime);
    const height = minHeight + (normalizedTime * (maxHeight - minHeight));
    
    return Math.max(minHeight, Math.min(maxHeight, height));
  };

  const statusCounts = getStatusCounts();
  const uptime = getUptimePercentage();
  const avgResponseTime = getAverageResponseTime();

  const handleMouseEnter = (item: ChartData, event: React.MouseEvent) => {
    setHoveredItem(item);
    setHoverPosition({ x: event.clientX, y: event.clientY });
  };

  const handleMouseLeave = () => {
    setHoveredItem(null);
  };

  return (
    <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`} dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">{agent.name}</h3>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              {agent.server_ip}
            </span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              agent.status === 'deployed' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {agent.status === 'deployed' ? 'فعال' : 'غیرفعال'}
            </span>
            <span className="text-xs">
              پورت: {agent.port}
            </span>
          </div>
        </div>
        
      </div>


      {/* Stats Cards - Show All Data */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-gray-900">{uptime}%</div>
          <div className="text-xs text-gray-600">آپتایم کل</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-gray-900">{avgResponseTime}ms</div>
          <div className="text-xs text-gray-600">میانگین پاسخ</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-red-600">{getDisruptionCount()}</div>
          <div className="text-xs text-gray-600">تعداد اختلالات</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-blue-600">{allChartData.length}</div>
          <div className="text-xs text-gray-600">کل بررسی‌ها</div>
        </div>
      </div>

      {/* Last Check Info */}
      <div className="bg-gray-50 rounded-lg p-3 text-center mb-6">
        <div className="text-sm font-medium text-gray-900">
          {agent.last_checked ? 
            new Date(agent.last_checked).toLocaleString('fa-IR', {
              timeZone: 'Asia/Tehran',
              hour: '2-digit',
              minute: '2-digit'
            }) : 'نامشخص'
          }
        </div>
        <div className="text-xs text-gray-600">آخرین چک</div>
      </div>

      {/* Chart */}
      <div className="relative">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-500">
            <div className="text-center">
              {selectedServers.length === 0 ? (
                <>
                  <div className="text-lg mb-2">⚠️ هیچ سروری انتخاب نشده</div>
                  <div className="text-sm">لطفاً حداقل یک سرور مقصد را انتخاب کنید</div>
                </>
              ) : allChartData.length === 0 ? (
                <>
                  <div className="text-lg mb-2">✅ هیچ اختلالی یافت نشد</div>
                  <div className="text-sm">تمام سرورهای مقصد در وضعیت عادی هستند</div>
                </>
              ) : (
                <>
                  <div className="text-lg mb-2">🔍 اختلالی در سرورهای انتخاب شده یافت نشد</div>
                  <div className="text-sm">سرورهای انتخاب شده در این بازه زمانی اختلال نداشته‌اند</div>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2 transition-all duration-300 ease-in-out">
            {/* Chart Bars - Only show disruptions */}
            <div className="flex items-end gap-1 h-20">
              {chartData.map((item, index) => (
                <div
                  key={`${item.time}-${index}`}
                  className="flex-1 rounded-t transition-all duration-500 ease-in-out cursor-pointer hover:opacity-100"
                  style={{
                    height: `${getBarHeight(item.responseTime || 0)}px`,
                    backgroundColor: item.serverColor, // Use server color for all disruptions
                    opacity: 0.8
                  }}
                  title={`${item.time} - ${item.serverName} - ${statusLabels[item.status]} - ${item.responseTime || 0}ms`}
                  onMouseEnter={(e) => handleMouseEnter(item, e)}
                  onMouseLeave={handleMouseLeave}
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

      {/* Disruption Legend - Only show non-up statuses */}
      <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-200">
        {Object.entries(statusLabels)
          .filter(([status]) => status !== 'up')
          .map(([status, label]) => (
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
        {chartData.length === 0 && (
          <div className="text-sm text-green-600 font-medium">
            ✅ هیچ اختلالی در این بازه زمانی وجود ندارد
          </div>
        )}
      </div>

      {/* Enhanced Tooltip for Disruptions */}
      {hoveredItem && (
        <div 
          className="fixed z-50 bg-gray-900 text-white p-4 rounded-lg shadow-xl text-sm max-w-sm border border-gray-700"
          style={{
            left: `${hoverPosition.x + 10}px`,
            top: `${hoverPosition.y - 10}px`,
          }}
        >
          <div className="font-bold mb-3 text-lg flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded-full" 
              style={{ backgroundColor: hoveredItem.serverColor }}
            ></div>
            {hoveredItem.serverName}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-300">نوع اختلال:</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                hoveredItem.status === 'down' ? 'bg-red-600' :
                hoveredItem.status === 'timeout' ? 'bg-yellow-600' :
                hoveredItem.status === 'error' ? 'bg-purple-600' :
                'bg-gray-600'
              }`}>
                {statusLabels[hoveredItem.status]}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">زمان:</span>
              <span className="text-white">{hoveredItem.time}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">زمان پاسخ:</span>
              <span className="text-white">{hoveredItem.responseTime || 0}ms</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">سرور مقصد:</span>
              <span className="text-white">{hoveredItem.serverName}</span>
            </div>
            {hoveredItem.errorMessage && (
              <div className="mt-3 pt-2 border-t border-gray-700">
                <div className="text-gray-300 text-xs mb-1">جزئیات خطا:</div>
                <div className="text-red-300 text-xs bg-gray-800 p-2 rounded">
                  {hoveredItem.errorMessage.length > 100 
                    ? hoveredItem.errorMessage.substring(0, 100) + '...' 
                    : hoveredItem.errorMessage}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
