'use client';

import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { MonitoringData } from '@/lib/types';
import { formatChartTime, getIranTime, persianToGregorian } from '@/lib/timezone';

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
  selectedServers?: number[];
  dateTimeFilter?: { date: string; timeRange: string } | null;
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

function AgentChart({ agent, className = '', selectedServers = [], dateTimeFilter = null }: AgentChartProps) {
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [allChartData, setAllChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<ChartData | null>(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);

  // Update current time every minute
  useEffect(() => {
    setCurrentTime(getIranTime());
    
    const timer = setInterval(() => {
      setCurrentTime(getIranTime());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Apply server filter to chart data - memoized for performance
  const applyServerFilter = useCallback((data: ChartData[]) => {
    if (selectedServers.length === 0) {
      // If no servers selected, show all disruptions
      const allDisruptions = data.filter(item => item.status !== 'up');
      setChartData(allDisruptions);
      return;
    }
    
    // Filter by selected servers and show ALL disruptions (not just 'down' status)
    const filteredData = data.filter(item => 
      item.serverId && selectedServers.includes(item.serverId) && item.status !== 'up'
    );
    setChartData(filteredData);
  }, [selectedServers]);

  const fetchChartData = useCallback(async (isRefresh = false) => {
    // Throttle API calls - don't fetch more than once every 5 seconds for refreshes
    const now = Date.now();
    if (isRefresh && now - lastFetchTime < 5000) {
      return;
    }
    
    try {
      if (!isRefresh) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }
      
      console.log(`Fetching monitoring data for agent ${agent.name} (${agent.server_ip})`);
      
      let url = `/api/agents/monitoring?source_ip=${agent.server_ip}`;
      
      // Use date/time filter - this is now required
      if (dateTimeFilter) {
        try {
          // Convert Persian date to Gregorian for API call
          const persianDateParts = dateTimeFilter.date.split('/');
          const persianYear = parseInt(persianDateParts[0]);
          const persianMonth = parseInt(persianDateParts[1]);
          const persianDay = parseInt(persianDateParts[2]);
          
          console.log('Parsed Persian date parts:', { persianYear, persianMonth, persianDay });
          
          // Use accurate Persian to Gregorian conversion
          const gregorianDate = persianToGregorian({
            year: persianYear,
            month: persianMonth,
            day: persianDay
          });
          
          console.log('Gregorian conversion result:', gregorianDate);
          console.log('Is valid date:', !isNaN(gregorianDate.getTime()));
          
          // Parse time range first
          const timeRangeParts = dateTimeFilter.timeRange.split(' – ');
          const startTime = timeRangeParts[0];
          const endTime = timeRangeParts[1];
          
          // Check if conversion was successful
          if (isNaN(gregorianDate.getTime())) {
            console.error('Failed to convert Persian date to Gregorian, using current date');
            const currentDate = new Date();
            const startDateTime = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 
              parseInt(startTime.split(':')[0]), parseInt(startTime.split(':')[1]), 0, 0);
            const endDateTime = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 
              parseInt(endTime.split(':')[0]), parseInt(endTime.split(':')[1]), 59, 999);
            
            url += `&start_datetime=${startDateTime.toISOString()}&end_datetime=${endDateTime.toISOString()}`;
            console.log(`Using fallback current date filter: ${startDateTime.toISOString()} to ${endDateTime.toISOString()}`);
          } else {
            // Create date range for filtering - use local timezone
            const startDateTime = new Date(gregorianDate.getFullYear(), gregorianDate.getMonth(), gregorianDate.getDate(), 
              parseInt(startTime.split(':')[0]), parseInt(startTime.split(':')[1]), 0, 0);
            const endDateTime = new Date(gregorianDate.getFullYear(), gregorianDate.getMonth(), gregorianDate.getDate(), 
              parseInt(endTime.split(':')[0]), parseInt(endTime.split(':')[1]), 59, 999);
            
            // Validate dates before using toISOString
            if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
              console.error('Invalid date range created:', { startDateTime, endDateTime, gregorianDate });
              throw new Error('Invalid date range');
            }
            
            url += `&start_datetime=${startDateTime.toISOString()}&end_datetime=${endDateTime.toISOString()}`;
            console.log(`Using date/time filter: ${startDateTime.toISOString()} to ${endDateTime.toISOString()}`);
            console.log(`Original Persian date: ${dateTimeFilter.date}, Time range: ${dateTimeFilter.timeRange}`);
            console.log(`Converted Gregorian date: ${gregorianDate.toDateString()}`);
            console.log(`Start time: ${startTime}, End time: ${endTime}`);
          }
        } catch (error) {
          console.error('Error processing date/time filter:', error);
          console.log('Falling back to default 6 hours filter');
          url += `&hours=6`;
        }
      } else {
        // If no date/time filter is set, use default 6 hours (last 6 hours)
        url += `&hours=6`;
        console.log(`No date/time filter set, using default 6 hours (last 6 hours)`);
      }
      
      const response = await fetch(url);
      console.log(`Response status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`Received ${data.monitoringData.length} monitoring records for agent ${agent.name}:`, data);
        
        // Convert to chart data, show ALL data (not just disruptions), and sort by time
        const allData: ChartData[] = data.monitoringData
          .map((item: any) => ({
            time: formatChartTime(item.checked_at),
            status: item.status,
            responseTime: item.response_time ? parseFloat(item.response_time) : null,
            serverName: item.server_name,
            serverColor: item.server_color,
            errorMessage: item.error_message,
            serverId: item.server_id // Add server ID for filtering
          }))
          .sort((a: ChartData, b: ChartData) => new Date(a.time).getTime() - new Date(b.time).getTime());
        
        console.log(`Processed chart data:`, allData);
        console.log(`Date/time filter applied:`, dateTimeFilter ? 'Yes' : 'No');
        console.log(`Total records found: ${allData.length}`);
        
        // Only update if data has actually changed to prevent jumping
        const dataChanged = JSON.stringify(allData) !== JSON.stringify(allChartData);
        if (dataChanged) {
          setAllChartData(allData);
          setLastFetchTime(now);
          
          // Apply server filter
          applyServerFilter(allData);
        } else {
          console.log('Data unchanged, skipping update to prevent jumping');
        }
      } else {
        const errorText = await response.text();
        console.error(`API error: ${response.status} - ${errorText}`);
        console.error(`URL that failed: ${url}`);
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
  }, [agent.name, agent.server_ip, dateTimeFilter, applyServerFilter, lastFetchTime]);

  useEffect(() => {
    // Initial load
    fetchChartData();
    
    // Auto-refresh every 30 seconds (balanced frequency)
    const interval = setInterval(() => {
      fetchChartData(true);
    }, 30000);
    
    return () => clearInterval(interval);
  }, [fetchChartData]);

  // Apply filter when selected servers change
  useEffect(() => {
    if (allChartData.length > 0) {
      applyServerFilter(allChartData);
    }
  }, [selectedServers, allChartData]);


  // Memoized computed values for better performance
  const statusCounts = useMemo(() => {
    // Use allChartData for status counts to show all statuses in legend
    return allChartData.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [allChartData]);

  const uptime = useMemo(() => {
    if (allChartData.length === 0) return 0;
    const upCount = allChartData.filter(item => item.status === 'up').length;
    return Math.round((upCount / allChartData.length) * 100);
  }, [allChartData]);

  const disruptionCount = useMemo(() => {
    return allChartData.filter(item => item.status !== 'up').length;
  }, [allChartData]);

  const avgResponseTime = useMemo(() => {
    const responseTimes = allChartData
      .filter(item => item.responseTime !== null && item.responseTime !== undefined && item.responseTime > 0 && item.status === 'up')
      .map(item => item.responseTime!);
    
    if (responseTimes.length === 0) return 0;
    const average = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    return Math.round(average);
  }, [allChartData]);

  const maxResponseTime = useMemo(() => {
    if (chartData.length === 0) return 100;
    const validResponseTimes = chartData
      .filter(d => d.responseTime !== null && d.responseTime !== undefined && d.responseTime > 0)
      .map(d => d.responseTime!);
    return validResponseTimes.length > 0 ? Math.max(...validResponseTimes, 100) : 100;
  }, [chartData]);

  const getBarHeight = useCallback((responseTime: number | null | undefined) => {
    const maxHeight = 60; // Maximum height in pixels
    const minHeight = 4;  // Minimum height in pixels
    
    if (!responseTime || responseTime <= 0) return minHeight;
    
    // Use square root scaling for better visual distribution
    const normalizedTime = Math.sqrt(responseTime) / Math.sqrt(maxResponseTime);
    const height = minHeight + (normalizedTime * (maxHeight - minHeight));
    
    return Math.max(minHeight, Math.min(maxHeight, height));
  }, [maxResponseTime]);

  const handleMouseEnter = useCallback((item: ChartData, event: React.MouseEvent) => {
    setHoveredItem(item);
    setHoverPosition({ x: event.clientX, y: event.clientY });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredItem(null);
  }, []);

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
              agent.is_active 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {agent.is_active ? 'فعال' : 'غیرفعال'}
            </span>
            <span className="text-xs">
              پورت: {agent.port}
            </span>
          </div>
        </div>
        
      </div>


      {/* Stats Cards - Show All Data */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-gray-900">{uptime}%</div>
          <div className="text-xs text-gray-600">آپتایم کل</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-gray-900">{avgResponseTime}ms</div>
          <div className="text-xs text-gray-600">میانگین پاسخ</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-red-600">{disruptionCount}</div>
          <div className="text-xs text-gray-600">تعداد اختلالات</div>
          <div className="text-xs text-blue-600 mt-1">
            {selectedServers.length === 0 ? 'همه سرورها' : `${selectedServers.length} سرور انتخاب شده`}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="relative">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : selectedServers.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-500">
            <div className="text-center">
              <div className="text-lg mb-2">📊 نمایش تمام اختلالات</div>
              <div className="text-sm">در حال نمایش تمام اختلالات (بدون فیلتر سرور)</div>
            </div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-500">
            <div className="text-center">
              {allChartData.length === 0 ? (
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
            {/* Chart Bars - Show all disruptions (not just 'down' status) with server color */}
            <div className="flex items-end gap-1 h-20">
              {chartData.map((item, index) => (
                <div
                  key={`${item.time}-${index}`}
                  className="flex-1 rounded-t transition-all duration-500 ease-in-out cursor-pointer hover:opacity-100"
                  style={{
                    height: `${getBarHeight(item.responseTime || 0)}px`,
                    backgroundColor: item.serverColor, // Use destination server color for disruptions
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

      {/* Status Legend - Show all disruption types */}
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
              <span className="text-xs text-blue-600 font-medium">(کندل)</span>
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
                hoveredItem.status === 'skipped' ? 'bg-gray-600' :
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

// Memoize the component to prevent unnecessary re-renders
export default memo(AgentChart);
