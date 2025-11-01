'use client';

import { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react';
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
    is_active?: boolean;
    current_status?: string;
    created_at: string;
    updated_at: string;
  };
  className?: string;
  selectedServers?: number[];
  dateTimeFilter?: { date: string; timeRange: string } | null;
  chartDisplayMode?: 'single' | 'dual';
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

function AgentChart({ agent, className = '', selectedServers = [], dateTimeFilter = null, chartDisplayMode = 'dual' }: AgentChartProps) {
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [allChartData, setAllChartData] = useState<ChartData[]>([]);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [hoveredItem, setHoveredItem] = useState<ChartData | null>(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  const [globalDisruptionCount, setGlobalDisruptionCount] = useState<number>(0);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const allChartDataRef = useRef<ChartData[]>([]);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Detect mobile/desktop
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint in Tailwind
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Update current time every minute
  useEffect(() => {
    setCurrentTime(getIranTime());
    
    const timer = setInterval(() => {
      setCurrentTime(getIranTime());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Fetch global disruption count from dashboard stats (optional - only if authenticated)
  // If not authenticated, we'll use local data instead
  const fetchGlobalDisruptionCount = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        // If not authenticated, calculate from local data instead
        // This allows the page to work without login
        return;
      }
      
      const headers = { 'Authorization': `Bearer ${token}` };
      const response = await fetch('/api/dashboard/stats', { headers });
      if (response.ok) {
        const data = await response.json();
        const globalCount = data.stats.downCount + data.stats.timeoutCount + data.stats.errorCount;
        setGlobalDisruptionCount(globalCount);
      }
    } catch (error) {
      console.error('Error fetching global disruption count:', error);
      // Silently fail - we'll use local data instead
    }
  }, []);

  // Create filtered version of allChartData based on selected servers
  // This will be used for all chart information (stats, legend, etc.)
  const filteredChartData = useMemo(() => {
    if (selectedServers.length === 0) {
      // If no servers selected, return all data
      return allChartData;
    }
    
    // Filter all data by selected servers
    return allChartData.filter(item => 
      item.serverId && selectedServers.includes(item.serverId)
    );
  }, [allChartData, selectedServers]);

  const fetchChartData = useCallback(async (isRefresh = false) => {
    // Throttle API calls - don't fetch more than once every 5 seconds for refreshes
    const now = Date.now();
    if (isRefresh && now - lastFetchTime < 5000) {
      return;
    }
    
    try {
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
          
          // Parse time range first - handle both Persian and English dash characters
          const timeRangeParts = dateTimeFilter.timeRange.split(/[–-]/);
          const startTime = timeRangeParts[0].trim();
          const endTime = timeRangeParts[1].trim();
          
          // Check if conversion was successful
          if (isNaN(gregorianDate.getTime())) {
            console.error('Failed to convert Persian date to Gregorian, using current date');
            const currentDate = new Date();
            // Convert Persian digits to English digits for parsing
            const startTimeEn = startTime.replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString());
            const endTimeEn = endTime.replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString());
            
            const startDateTime = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 
              parseInt(startTimeEn.split(':')[0]), parseInt(startTimeEn.split(':')[1]), 0, 0);
            const endDateTime = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 
              parseInt(endTimeEn.split(':')[0]), parseInt(endTimeEn.split(':')[1]), 59, 999);
            
            url += `&start_datetime=${startDateTime.toISOString()}&end_datetime=${endDateTime.toISOString()}`;
            console.log(`Using fallback current date filter: ${startDateTime.toISOString()} to ${endDateTime.toISOString()}`);
          } else {
            // Create date range for filtering - use Iran timezone
            // Convert Persian digits to English digits for parsing
            const startTimeEn = startTime.replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString());
            const endTimeEn = endTime.replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString());
            
            // Parse time components
            const [startHour, startMinute] = startTimeEn.split(':').map(Number);
            const [endHour, endMinute] = endTimeEn.split(':').map(Number);
            
            console.log('Parsed time components:', { startHour, startMinute, endHour, endMinute });
            console.log('Gregorian date from conversion:', gregorianDate.toDateString());
            
            // Validate gregorianDate before using
            let startDateTime: Date;
            let endDateTime: Date;
            
            if (isNaN(gregorianDate.getTime())) {
              console.error('Invalid gregorianDate, using current date:', gregorianDate);
              const currentDate = new Date();
              // Create date in Iran timezone by using local date components
              startDateTime = new Date(Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), currentDate.getUTCDate(), 
                startHour - 3.5, startMinute, 0, 0)); // Iran is UTC+3:30
              endDateTime = new Date(Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), currentDate.getUTCDate(), 
                endHour - 3.5, endMinute, 59, 999));
              console.log(`Using current date filter: ${startDateTime.toISOString()} to ${endDateTime.toISOString()}`);
            } else {
              // Create dates by manually constructing the date string
              const year = gregorianDate.getFullYear();
              const month = String(gregorianDate.getMonth() + 1).padStart(2, '0');
              const day = String(gregorianDate.getDate()).padStart(2, '0');
              const startHourStr = String(startHour).padStart(2, '0');
              const startMinStr = String(startMinute).padStart(2, '0');
              const endHourStr = String(endHour).padStart(2, '0');
              const endMinStr = String(endMinute).padStart(2, '0');
              
              // Create date string in ISO format - PostgreSQL will interpret this correctly
              const dateStr = `${year}-${month}-${day}`;
              const startTimeStr = `${startHourStr}:${startMinStr}:00`;
              const endTimeStr = `${endHourStr}:${endMinStr}:59`;
              
              // Create date objects using local time (assuming server timezone matches Iran timezone)
              startDateTime = new Date(`${dateStr}T${startTimeStr}`);
              endDateTime = new Date(`${dateStr}T${endTimeStr}`);
              
              console.log(`Created date strings: ${dateStr}T${startTimeStr} to ${dateStr}T${endTimeStr}`);
              console.log(`Full date objects: ${startDateTime.toString()} to ${endDateTime.toString()}`);
              
              // Validate dates
              if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
                console.error('Invalid date range created:', { startDateTime, endDateTime, gregorianDate });
                throw new Error('Invalid date range');
              }
              console.log(`Using date/time filter: ${startDateTime.toISOString()} to ${endDateTime.toISOString()}`);
            }
            
            url += `&start_datetime=${startDateTime.toISOString()}&end_datetime=${endDateTime.toISOString()}`;
            console.log(`Original Persian date: ${dateTimeFilter.date}, Time range: ${dateTimeFilter.timeRange}`);
            console.log(`Converted Gregorian date: ${gregorianDate.toDateString()}`);
            console.log(`Start time: ${startTime}, End time: ${endTime}`);
            console.log(`Full URL: ${url}`);
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
        
        // Convert to chart data and sort by time
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
        
        // Filter to only show disruptions (down, timeout, error status) for candles
        const filteredData = allData.filter(item => 
          ['down', 'timeout', 'error'].includes(item.status)
        );
        
        console.log(`Processed chart data:`, filteredData);
        console.log(`Date/time filter applied:`, dateTimeFilter ? 'Yes' : 'No');
        console.log(`Total records found: ${allData.length}, Disruptions: ${filteredData.length}`);
        
        // Only update if data has actually changed to prevent jumping
        const dataChanged = JSON.stringify(allData) !== JSON.stringify(allChartDataRef.current);
        if (dataChanged) {
          // Update state smoothly without causing jumps
          setAllChartData(allData);
          allChartDataRef.current = allData;
          setLastFetchTime(now);
          
          // chartData (candles) will be updated automatically via the useEffect
          // that watches filteredChartData, which is computed from allChartData
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
    }
  }, [agent.name, agent.server_ip, dateTimeFilter, lastFetchTime]);

  useEffect(() => {
    // Initialize ref
    allChartDataRef.current = allChartData;
  }, [allChartData]);

  useEffect(() => {
    // Initial load
    fetchChartData();
    fetchGlobalDisruptionCount();
    
    // Auto-refresh every 1 minute (balanced frequency)
    const interval = setInterval(() => {
      fetchChartData(true);
      fetchGlobalDisruptionCount();
    }, 60000);
    
    return () => clearInterval(interval);
  }, [fetchChartData, fetchGlobalDisruptionCount]);

  // Apply filter when selected servers or filteredChartData changes
  // Update chartData (candles) to show only disruptions from filteredChartData
  useEffect(() => {
    if (filteredChartData.length >= 0) {
      // Filter to only show disruptions (down, timeout, error status) for candles
      // Use filteredChartData (which already respects server filter)
      const disruptionsData = filteredChartData.filter(item => 
        ['down', 'timeout', 'error'].includes(item.status)
      );
      setChartData(disruptionsData);
    }
  }, [filteredChartData]);


  // Memoized computed values for better performance
  // Use filteredChartData (which respects server filter) for all calculations
  const statusCounts = useMemo(() => {
    // Use filteredChartData for status counts to respect server filter
    return filteredChartData.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [filteredChartData]);

  const uptime = useMemo(() => {
    if (filteredChartData.length === 0) return 0;
    const upCount = filteredChartData.filter(item => item.status === 'up').length;
    return Math.round((upCount / filteredChartData.length) * 100);
  }, [filteredChartData]);

  const disruptionCount = useMemo(() => {
    // If datetime filter is active, count disruptions from the filtered data
    if (dateTimeFilter) {
      // Count all disruptions in the filteredChartData (respects server filter)
      const count = filteredChartData.filter(item => 
        ['down', 'timeout', 'error'].includes(item.status)
      ).length;
      
      // Debug logging
      console.log(`[${agent.name}] disruptionCount with datetime filter:`, {
        dateTimeFilter: dateTimeFilter,
        filteredChartDataLength: filteredChartData.length,
        disruptionCount: count,
        globalDisruptionCount: globalDisruptionCount,
        selectedServersCount: selectedServers.length
      });
      
      return count;
    }
    
    // When no datetime filter, count disruptions from filtered data
    // If no servers selected and we have global count (user is authenticated), show global count
    // Otherwise, count from filtered data (works for unauthenticated users too)
    if (selectedServers.length === 0 && globalDisruptionCount > 0) {
      return globalDisruptionCount;
    }
    
    // Count disruptions from filtered data (works for both authenticated and unauthenticated users)
    return filteredChartData.filter(item => 
      ['down', 'timeout', 'error'].includes(item.status)
    ).length;
  }, [globalDisruptionCount, filteredChartData, dateTimeFilter, agent.name, selectedServers.length]);

  const avgResponseTime = useMemo(() => {
    const responseTimes = filteredChartData
      .filter(item => item.responseTime !== null && item.responseTime !== undefined && item.responseTime > 0 && item.status === 'up')
      .map(item => item.responseTime!);
    
    if (responseTimes.length === 0) return 0;
    const average = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const rounded = Math.round(average);
    
    // Debug logging
    console.log(`[${agent.name}] avgResponseTime calculation:`, {
      totalData: filteredChartData.length,
      validResponseTimes: responseTimes.length,
      average: average,
      rounded: rounded,
      dateTimeFilterActive: !!dateTimeFilter,
      selectedServersCount: selectedServers.length
    });
    
    return rounded;
  }, [filteredChartData, agent.name, dateTimeFilter, selectedServers.length]);

  const maxResponseTime = useMemo(() => {
    // Use filteredChartData instead of chartData for consistent filtering
    const validResponseTimes = filteredChartData
      .filter(d => d.responseTime !== null && d.responseTime !== undefined && d.responseTime > 0)
      .map(d => d.responseTime!);
    return validResponseTimes.length > 0 ? Math.max(...validResponseTimes, 100) : 100;
  }, [filteredChartData]);

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
    <div className={`bg-white rounded-xl shadow-lg p-3 sm:p-4 md:p-6 ${className}`} dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-start mb-4 sm:mb-6">
        <div>
          <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-1 sm:mb-2">{agent.name}</h3>
          <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-blue-500"></div>
              {agent.server_ip}
            </span>
            <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium ${
              (agent.current_status === 'active' || agent.is_active) 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {(agent.current_status === 'active' || agent.is_active) ? 'فعال' : 'غیرفعال'}
            </span>
            <span className="text-[10px] sm:text-xs">
              پورت: {agent.port}
            </span>
          </div>
        </div>
        
      </div>


      {/* Stats Cards - Show All Data */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
        <div className="bg-gray-50 rounded-lg p-2 sm:p-3 text-center">
          <div className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">{uptime}%</div>
          <div className="text-[10px] sm:text-xs text-gray-600">آپتایم کل</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2 sm:p-3 text-center">
          <div className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">{avgResponseTime}ms</div>
          <div className="text-[10px] sm:text-xs text-gray-600">میانگین پاسخ</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2 sm:p-3 text-center">
          <div className="text-lg sm:text-xl md:text-2xl font-bold text-red-600">{disruptionCount}</div>
          <div className="text-[10px] sm:text-xs text-gray-600">تعداد اختلالات</div>
          <div className="text-[10px] sm:text-xs text-blue-600 mt-0.5 sm:mt-1">
            {selectedServers.length === 0 ? 'همه سرورها' : `${selectedServers.length} سرور انتخاب شده`}
          </div>
          {dateTimeFilter && (
            <div className="text-[10px] sm:text-xs text-green-600 mt-0.5 sm:mt-1 font-semibold">
              فیلتر زمانی فعال است
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="relative min-h-[120px]">
        {selectedServers.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-500">
            <div className="text-center">
              <div className="text-sm sm:text-base md:text-lg mb-1 sm:mb-2">📊 نمایش تمام اختلالات</div>
              <div className="text-xs sm:text-sm">در حال نمایش تمام اختلالات (بدون فیلتر سرور)</div>
            </div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-500">
            <div className="text-center">
              {allChartData.length === 0 ? (
                <>
                  <div className="text-sm sm:text-base md:text-lg mb-1 sm:mb-2">✅ هیچ اختلالی یافت نشد</div>
                  <div className="text-xs sm:text-sm">تمام سرورهای مقصد در وضعیت عادی هستند</div>
                </>
              ) : (
                <>
                  <div className="text-sm sm:text-base md:text-lg mb-1 sm:mb-2">🔍 اختلالی در سرورهای انتخاب شده یافت نشد</div>
                  <div className="text-xs sm:text-sm">سرورهای انتخاب شده در این بازه زمانی اختلال نداشته‌اند</div>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Chart Bars Container - Scrollable only in dual mode or mobile */}
            <div className="relative">
              {(() => {
                // Enable scroll only if:
                // 1. More than 50 candles AND
                // 2. (Mobile OR dual mode) - NOT single mode on desktop
                const shouldEnableScroll = chartData.length > 50 && (isMobile || chartDisplayMode === 'dual');
                const shouldUseFixedWidth = shouldEnableScroll;
                const candleWidth = shouldUseFixedWidth ? 4 : undefined;
                
                return (
                  <>
                    <div 
                      ref={chartContainerRef}
                      className={`${shouldEnableScroll ? 'chart-scrollable overflow-x-auto' : 'overflow-hidden'} overflow-y-visible`}
                      style={{
                        scrollBehavior: shouldEnableScroll ? 'smooth' : undefined
                      }}
                    >
                      <div 
                        className={`flex items-end gap-1 h-20 ${!shouldEnableScroll ? 'w-full' : ''}`}
                        style={{
                          minWidth: shouldEnableScroll ? `${chartData.length * 4 + (chartData.length - 1) * 4}px` : undefined
                        }}
                      >
                        {chartData.map((item, index) => (
                          <div
                            key={`${agent.id}-${item.time}-${index}`}
                            className={`${!shouldUseFixedWidth ? 'flex-1' : ''} rounded-t cursor-pointer hover:opacity-100 transition-all duration-200`}
                            style={{
                              height: `${getBarHeight(item.responseTime || 0)}px`,
                              backgroundColor: item.serverColor,
                              opacity: 0.8,
                              minWidth: candleWidth ? `${candleWidth}px` : undefined,
                              width: candleWidth ? `${candleWidth}px` : undefined
                            }}
                            title={`${item.time} - ${item.serverName} - ${statusLabels[item.status]} - ${item.responseTime || 0}ms`}
                            onMouseEnter={(e) => handleMouseEnter(item, e)}
                            onMouseLeave={handleMouseLeave}
                          />
                        ))}
                      </div>
                    </div>
                    
                    {/* Scroll indicator when chart is scrollable */}
                    {shouldEnableScroll && (
                      <div className="absolute top-0 right-0 bg-blue-50 text-blue-600 text-[10px] px-2 py-1 rounded-br-lg rounded-bl-lg border border-blue-200 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                        </svg>
                        <span>اسکرول کنید ({chartData.length} کندل)</span>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
            
            {/* Time Labels */}
            <div className="flex justify-between text-[10px] sm:text-xs text-gray-500 mt-2">
              <span suppressHydrationWarning>{chartData[0]?.time}</span>
              <span suppressHydrationWarning>{chartData[chartData.length - 1]?.time}</span>
            </div>
          </div>
        )}
      </div>

      {/* Status Legend - Show all disruption types */}
      <div className="flex flex-wrap gap-2 sm:gap-4 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200">
        {Object.entries(statusLabels)
          .filter(([status]) => status !== 'up')
          .map(([status, label]) => (
            <div key={status} className="flex items-center gap-1.5 sm:gap-2">
              <div 
                className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full" 
                style={{ backgroundColor: statusColors[status as keyof typeof statusColors] }}
              ></div>
              <span className="text-xs sm:text-sm text-gray-600">{label}</span>
              <span className="text-xs sm:text-sm font-medium text-gray-900">
                ({statusCounts[status] || 0})
              </span>
              {/* <span className="text-xs text-blue-600 font-medium">(کندل)</span> */}
            </div>
          ))}
        {chartData.length === 0 && (
          <div className="text-xs sm:text-sm text-green-600 font-medium">
            ✅ هیچ اختلالی در این بازه زمانی وجود ندارد
          </div>
        )}
      </div>

      {/* Enhanced Tooltip for Disruptions */}
      {hoveredItem && (
        <div 
          className="fixed z-50 bg-gray-900 text-white p-2 sm:p-4 rounded-lg shadow-xl text-xs sm:text-sm max-w-sm border border-gray-700"
          style={{
            left: `${hoverPosition.x + 10}px`,
            top: `${hoverPosition.y - 10}px`,
          }}
        >
          <div className="font-bold mb-2 sm:mb-3 text-sm sm:text-base md:text-lg flex items-center gap-1.5 sm:gap-2">
            <div 
              className="w-3 h-3 sm:w-4 sm:h-4 rounded-full" 
              style={{ backgroundColor: hoveredItem.serverColor }}
            ></div>
            {hoveredItem.serverName}
          </div>
          <div className="space-y-1.5 sm:space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-300 text-[10px] sm:text-xs">نوع اختلال:</span>
              <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs font-medium ${
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
              <span className="text-gray-300 text-[10px] sm:text-xs">زمان:</span>
              <span className="text-white text-[10px] sm:text-xs">{hoveredItem.time}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300 text-[10px] sm:text-xs">زمان پاسخ:</span>
              <span className="text-white text-[10px] sm:text-xs">{hoveredItem.responseTime || 0}ms</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300 text-[10px] sm:text-xs">سرور مقصد:</span>
              <span className="text-white text-[10px] sm:text-xs">{hoveredItem.serverName}</span>
            </div>
            {hoveredItem.errorMessage && (
              <div className="mt-2 sm:mt-3 pt-1.5 sm:pt-2 border-t border-gray-700">
                <div className="text-gray-300 text-[10px] sm:text-xs mb-0.5 sm:mb-1">جزئیات خطا:</div>
                <div className="text-red-300 text-[10px] sm:text-xs bg-gray-800 p-1.5 sm:p-2 rounded">
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
