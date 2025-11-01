'use client';

import { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react';
import { MonitoringData, ServerWithStatus } from '@/lib/types';
import { formatChartTime, getIranTime, persianToGregorian } from '@/lib/timezone';

interface ServerChartProps {
  server: ServerWithStatus;
  className?: string;
  dateTimeFilter?: { date: string; timeRange: string } | null;
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
  skipped: 'رد شده',
  active: 'فعال',
  inactive: 'غیرفعال',
  unknown: 'نامشخص'
};

function ServerChart({ server, className = '', dateTimeFilter = null }: ServerChartProps) {
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [allChartData, setAllChartData] = useState<ChartData[]>([]);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const allChartDataRef = useRef<ChartData[]>([]);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Update current time every minute
  useEffect(() => {
    // Set initial time on client side only
    setCurrentTime(getIranTime());
    
    const timer = setInterval(() => {
      setCurrentTime(getIranTime());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const fetchChartData = useCallback(async (isRefresh = false) => {
    // Throttle API calls - don't fetch more than once every 5 seconds for refreshes
    const now = Date.now();
    if (isRefresh && now - lastFetchTime < 5000) {
      return;
    }
    
    try {
      console.log(`Fetching monitoring data for server ${server.id}`);
      
      let url = `/api/public/servers/${server.id}/monitoring`;
      
      // Use date/time filter - this is now required
      if (dateTimeFilter) {
        // Convert Persian date to Gregorian for API call
        const persianDateParts = dateTimeFilter.date.split('/');
        const persianYear = parseInt(persianDateParts[0]);
        const persianMonth = parseInt(persianDateParts[1]);
        const persianDay = parseInt(persianDateParts[2]);
        
        // Use accurate Persian to Gregorian conversion
        const gregorianDate = persianToGregorian({
          year: persianYear,
          month: persianMonth,
          day: persianDay
        });
        
        // Parse time range
        const timeRangeParts = dateTimeFilter.timeRange.split(' – ');
        const startTime = timeRangeParts[0];
        const endTime = timeRangeParts[1];
        
        // Create date range for filtering
        const startDateTime = new Date(gregorianDate.getFullYear(), gregorianDate.getMonth(), gregorianDate.getDate(), 
          parseInt(startTime.split(':')[0]), parseInt(startTime.split(':')[1]));
        const endDateTime = new Date(gregorianDate.getFullYear(), gregorianDate.getMonth(), gregorianDate.getDate(), 
          parseInt(endTime.split(':')[0]), parseInt(endTime.split(':')[1]));
        
        url += `?start_datetime=${startDateTime.toISOString()}&end_datetime=${endDateTime.toISOString()}`;
        console.log(`Using date/time filter: ${startDateTime.toISOString()} to ${endDateTime.toISOString()}`);
      } else {
        // If no date/time filter is set, use default 6 hours (last 6 hours)
        url += `?hours=6`;
        console.log(`No date/time filter set, using default 6 hours (last 6 hours)`);
      }
      
      // Use API endpoint instead of direct database access
      const response = await fetch(url);
      console.log(`Response status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`Received ${data.length} monitoring records for server ${server.id}:`, data);
        
        // Convert to chart data and sort by time
        const allData: ChartData[] = data
          .map((item: any) => ({
            time: formatChartTime(item.checked_at),
            status: item.status,
            responseTime: item.response_time
          }))
          .sort((a: ChartData, b: ChartData) => new Date(a.time).getTime() - new Date(b.time).getTime());
        
        // Filter to only show disruptions (down, timeout, error status) for candles
        const filteredData = allData.filter(item => 
          ['down', 'timeout', 'error'].includes(item.status)
        );
        
        console.log(`Processed chart data:`, filteredData);
        
        // Only update if data has actually changed to prevent jumping
        const dataChanged = JSON.stringify(allData) !== JSON.stringify(allChartDataRef.current);
        if (dataChanged) {
          // Update state smoothly without causing jumps
          setAllChartData(allData);
          setChartData(filteredData);
          allChartDataRef.current = allData;
          setLastFetchTime(now);
        }
      } else {
        const errorText = await response.text();
        console.error(`API error: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('Error fetching chart data:', error);
    }
  }, [server.id, dateTimeFilter, lastFetchTime]);

  useEffect(() => {
    // Initialize ref
    allChartDataRef.current = allChartData;
  }, [allChartData]);

  useEffect(() => {
    // Initial load
    fetchChartData();
    
    // Auto-refresh every 1 minute (balanced frequency)
    const interval = setInterval(() => {
      fetchChartData(true);
    }, 60000);
    
    return () => clearInterval(interval);
  }, [fetchChartData]);


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

  const avgResponseTime = useMemo(() => {
    const responseTimes = allChartData
      .filter(item => item.responseTime && item.status === 'up')
      .map(item => item.responseTime!);
    
    if (responseTimes.length === 0) return 0;
    return Math.round(responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length);
  }, [allChartData]);

  const maxResponseTime = useMemo(() => {
    if (chartData.length === 0) return 100;
    return Math.max(...chartData.map(d => d.responseTime || 0), 100);
  }, [chartData]);

  const getBarHeight = useCallback((responseTime: number) => {
    const maxHeight = 60; // Maximum height in pixels
    const minHeight = 4;  // Minimum height in pixels
    
    if (responseTime <= 0) return minHeight;
    
    // Use square root scaling for better visual distribution
    // This prevents extremely tall bars while maintaining relative differences
    const normalizedTime = Math.sqrt(responseTime) / Math.sqrt(maxResponseTime);
    const height = minHeight + (normalizedTime * (maxHeight - minHeight));
    
    return Math.max(minHeight, Math.min(maxHeight, height));
  }, [maxResponseTime]);

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
          <div className="text-xs text-gray-600">تعداد اختلال</div>
        </div>
      </div>

      {/* Chart */}
      <div className="relative min-h-[120px]">
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-500">
            داده‌ای برای نمایش وجود ندارد
          </div>
        ) : (
          <div className="space-y-2">
            {/* Chart Bars Container - Scrollable when too many candles */}
            <div className="relative">
              <div 
                ref={chartContainerRef}
                className="chart-scrollable overflow-x-auto overflow-y-visible"
                style={{
                  scrollBehavior: 'smooth'
                }}
              >
                <div 
                  className={`flex items-end gap-1 h-20 ${chartData.length <= 50 ? 'w-full' : ''}`}
                  style={{
                    minWidth: chartData.length > 50 ? `${chartData.length * 4 + (chartData.length - 1) * 4}px` : undefined
                  }}
                >
                  {chartData.map((item, index) => {
                    // If more than 50 candles, use fixed width (4px for better visibility), otherwise use flex-1
                    const shouldUseFixedWidth = chartData.length > 50;
                    const candleWidth = shouldUseFixedWidth ? 4 : undefined;
                    
                    return (
                      <div
                        key={`${server.id}-${item.time}-${index}`}
                        className={`${shouldUseFixedWidth ? '' : 'flex-1'} rounded-t cursor-pointer hover:opacity-100 transition-all duration-200`}
                        style={{
                          height: `${getBarHeight(item.responseTime || 0)}px`,
                          backgroundColor: server.color,
                          opacity: 0.8,
                          minWidth: candleWidth ? `${candleWidth}px` : undefined,
                          width: candleWidth ? `${candleWidth}px` : undefined
                        }}
                        title={`${item.time} - ${statusLabels[item.status]} - ${item.responseTime || 0}ms`}
                      />
                    );
                  })}
                </div>
              </div>
              
              {/* Scroll indicator when chart is scrollable */}
              {chartData.length > 50 && (
                <div className="absolute top-0 right-0 bg-blue-50 text-blue-600 text-[10px] px-2 py-1 rounded-br-lg rounded-bl-lg border border-blue-200 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  </svg>
                  <span>اسکرول کنید ({chartData.length} کندل)</span>
                </div>
              )}
            </div>
            
            {/* Time Labels */}
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span suppressHydrationWarning>{chartData[0]?.time}</span>
              <span suppressHydrationWarning>{chartData[chartData.length - 1]?.time}</span>
            </div>
          </div>
        )}
      </div>

      {/* Status Legend - Show all statuses, but only disruptions appear as candles */}
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
            {status === 'down' && (
              <span className="text-xs text-blue-600 font-medium">(کندل)</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Memoize the component to prevent unnecessary re-renders
export default memo(ServerChart);
