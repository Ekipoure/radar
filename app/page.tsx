'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AgentChart from '@/components/AgentChart';
import GlobalFilters from '@/components/GlobalFilters';
import AdDisplay from '@/components/AdDisplay';
import DateTimeFilterModal from '@/components/DateTimeFilterModal';
import { Agent } from '@/lib/types';
import { formatHeaderTime, formatTableTime, getIranTime, persianToGregorian } from '@/lib/timezone';

export default function Home() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'charts' | 'cards'>('charts');
  const [chartDisplayMode, setChartDisplayMode] = useState<'single' | 'dual'>('dual');
  const [chartType, setChartType] = useState<'agents'>('agents');
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Global filter state
  const [globalSelectedServers, setGlobalSelectedServers] = useState<number[]>([]);
  
  // Location filter state (internal/external)
  const [locationFilter, setLocationFilter] = useState<'all' | 'internal' | 'external'>('all');
  
  // Date/Time filter state
  const [isDateTimeFilterOpen, setIsDateTimeFilterOpen] = useState(false);
  const [dateTimeFilter, setDateTimeFilter] = useState<{ date: string; timeRange: string } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Update current time every minute
  useEffect(() => {
    // Set initial time on client side only
    setCurrentTime(getIranTime());
    
    const timer = setInterval(() => {
      setCurrentTime(getIranTime());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const initializeMonitoring = async () => {
      try {
        // Initialize monitoring service first
        const initResponse = await fetch('/api/init-monitoring', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (initResponse.ok) {
          const initData = await initResponse.json();
          console.log('Monitoring service initialized:', initData);
        } else {
          console.warn('Failed to initialize monitoring service, continuing anyway...');
        }
      } catch (error) {
        console.warn('Error initializing monitoring service:', error);
      }
    };

    const fetchData = async (isRefresh = false) => {
      try {
        // Only show loading on initial load, not on refreshes
        if (!isRefresh) {
          setLoading(true);
        }
        
        const agentsResponse = await fetch('/api/agents/monitoring');
        
        console.log('Agents API response status:', agentsResponse.status);
        if (agentsResponse.ok) {
          const data = await agentsResponse.json();
          console.log('Agents data received:', data);
          setAgents(data.agents);
        } else {
          const errorText = await agentsResponse.text();
          console.error('Agents API error:', agentsResponse.status, errorText);
        }
        
        setLastUpdate(getIranTime());
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        if (!isRefresh) {
          setLoading(false);
          setIsInitialLoad(false);
        }
      }
    };

    // Initialize monitoring service and then fetch data
    const initializeAndFetch = async () => {
      await initializeMonitoring();
      await fetchData();
    };

    // Initial load
    initializeAndFetch();
    
    // Auto-refresh data every 1 minute (silent)
    const interval = setInterval(() => {
      fetchData(true);
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);

  // Force refresh when data changes
  useEffect(() => {
    if (!isInitialLoad && agents.length > 0) {
      const fetchData = async () => {
        try {
          const agentsResponse = await fetch('/api/agents/monitoring');
          
          if (agentsResponse.ok) {
            const data = await agentsResponse.json();
            setAgents(data.agents);
          }
          
          setLastUpdate(getIranTime());
        } catch (error) {
          console.error('Failed to refresh data:', error);
        }
      };
      
      fetchData();
    }
  }, [agents.map(a => `${a.id}-${a.status}`).join(',')]);

  // Filter agents based on location_type (supports both location_type and location fields)
  const filteredAgents = locationFilter === 'all' 
    ? agents 
    : agents.filter(agent => {
        const location = (agent as any).location_type || (agent as any).location;
        return location === locationFilter;
      });

  const getStats = () => {
    const activeAgents = agents.filter(a => a.status === 'deployed');
    const inactiveAgents = agents.filter(a => a.status !== 'deployed');
    
    return {
      total: agents.length,
      active: activeAgents.length,
      inactive: inactiveAgents.length,
      iranian: 0, // Agents don't have server_group
      global: agents.length
    };
  };

  const stats = getStats();

  // Handle date/time filter application
  const handleDateTimeFilterApply = (filter: { date: string; timeRange: string }) => {
    setDateTimeFilter(filter);
    console.log('Date/Time Filter Applied:', filter);
    
    // Apply the filter to chart data
    applyDateTimeFilter(filter);
    
    // Force refresh of all charts by updating a refresh key
    setRefreshKey(Date.now());
  };

  // Apply date/time filter to chart data
  const applyDateTimeFilter = async (filter: { date: string; timeRange: string }) => {
    try {
      console.log('Applying date/time filter:', filter);
      
      // Convert Persian date to Gregorian for API call
      const persianDateParts = filter.date.split('/');
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
      console.log('Is valid gregorianDate:', !isNaN(gregorianDate.getTime()));
      
      // Parse time range - handle both Persian and English dash characters
      const timeRangeParts = filter.timeRange.split(/[–-]/);
      const startTime = timeRangeParts[0].trim();
      const endTime = timeRangeParts[1].trim();
      
      console.log('Parsed time range:', { startTime, endTime });
      
      // Convert Persian digits to English digits for parsing
      const startTimeEn = startTime.replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString());
      const endTimeEn = endTime.replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString());
      
      console.log('Converted time to English:', { startTimeEn, endTimeEn });
      
      // Validate gregorianDate before using
      if (isNaN(gregorianDate.getTime())) {
        console.error('Invalid gregorianDate, using current date:', gregorianDate);
        const currentDate = new Date();
        const startDateTime = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 
          parseInt(startTimeEn.split(':')[0]), parseInt(startTimeEn.split(':')[1]), 0, 0);
        const endDateTime = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 
          parseInt(endTimeEn.split(':')[0]), parseInt(endTimeEn.split(':')[1]), 59, 999);
        
        console.log('Using current date filter:', { startDateTime, endDateTime });
        console.log('Filter parameters:', {
          startDateTime: startDateTime.toISOString(),
          endDateTime: endDateTime.toISOString(),
          persianDate: filter.date,
          timeRange: filter.timeRange,
          gregorianDate: 'Invalid - using current date'
        });
      } else {
        // Create date range for filtering - use local timezone
        const startDateTime = new Date(gregorianDate.getFullYear(), gregorianDate.getMonth(), gregorianDate.getDate(), 
          parseInt(startTimeEn.split(':')[0]), parseInt(startTimeEn.split(':')[1]), 0, 0);
        const endDateTime = new Date(gregorianDate.getFullYear(), gregorianDate.getMonth(), gregorianDate.getDate(), 
          parseInt(endTimeEn.split(':')[0]), parseInt(endTimeEn.split(':')[1]), 59, 999);
        
        // Validate dates before using toISOString
        if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
          console.error('Invalid date range created:', { startDateTime, endDateTime, gregorianDate });
          throw new Error('Invalid date range');
        }
        
        console.log('Filtering data from:', startDateTime, 'to:', endDateTime);
        
        // Here you would typically make an API call to get filtered data
        // For now, we'll just log the filter parameters
        console.log('Filter parameters:', {
          startDateTime: startDateTime.toISOString(),
          endDateTime: endDateTime.toISOString(),
          persianDate: filter.date,
          timeRange: filter.timeRange,
          gregorianDate: gregorianDate.toDateString()
        });
      }
      
      // TODO: Implement actual API call to get filtered chart data
      // const filteredData = await fetchFilteredChartData(startDateTime, endDateTime);
      // setAgents(filteredData);
      
    } catch (error) {
      console.error('Error applying date/time filter:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50" dir="rtl">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 py-3 sm:py-4">
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 truncate">رادار مانیتورینگ</h1>
                <p className="text-xs sm:text-sm text-gray-600">سیستم نظارت بر سرورها</p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
              <div className="text-xs sm:text-sm text-gray-700 order-2 sm:order-1">
                <span className="whitespace-nowrap">پایش هوشمند، تصمیم مطمئن</span>
              </div>
              <Link
                href="/dashboard"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-xl whitespace-nowrap order-1 sm:order-2 w-full sm:w-auto text-center"
              >
                پنل مدیریت
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-4 sm:py-6 lg:py-8 px-3 sm:px-4 lg:px-6 xl:px-8">
        {/* Advertisement Section */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <AdDisplay />
        </div>

        {/* Stats Overview */}
        {/* <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 text-center transition-all duration-300 ease-in-out">
            <div className="text-3xl font-bold text-gray-900 transition-all duration-500 ease-in-out">{stats.total}</div>
            <div className="text-sm text-gray-600">کل ایجنت‌ها</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 text-center transition-all duration-300 ease-in-out">
            <div className="text-3xl font-bold text-green-600 transition-all duration-500 ease-in-out">{stats.active}</div>
            <div className="text-sm text-gray-600">فعال</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 text-center transition-all duration-300 ease-in-out">
            <div className="text-3xl font-bold text-red-600 transition-all duration-500 ease-in-out">{stats.inactive}</div>
            <div className="text-sm text-gray-600">غیرفعال</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 text-center transition-all duration-300 ease-in-out">
            <div className="text-3xl font-bold text-blue-600 transition-all duration-500 ease-in-out">{stats.iranian}</div>
            <div className="text-sm text-gray-600">کل ایجنت‌ها</div>
          </div>
        </div> */}

        {/* Controls */}
        <div className="flex flex-col gap-3 sm:gap-4 mb-6 sm:mb-8">
          {/* Top Row: View Mode Buttons (Left) + Location Filter and Time Filter (Right) */}
          <div className="flex flex-col md:flex-row gap-2 sm:gap-2 items-start md:items-center justify-between">
            {/* View Mode and Chart Display Toggles - Left side on desktop */}
            <div className="hidden md:flex flex-wrap gap-2 order-2 md:order-2">
              {/* <button
                onClick={() => setViewMode('charts')}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                  viewMode === 'charts'
                    ? 'bg-purple-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                نمایش چارت
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                  viewMode === 'cards'
                    ? 'bg-purple-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                نمایش کارت
              </button> */}
              
              {/* Chart Display Mode Toggle - Only show when charts view is selected */}
              {viewMode === 'charts' && (
                <>
                  <button
                    onClick={() => setChartDisplayMode('single')}
                    className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                      chartDisplayMode === 'single'
                        ? 'bg-green-500 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                    }`}
                  >
                    تک چارت
                  </button>
                  <button
                    onClick={() => setChartDisplayMode('dual')}
                    className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                      chartDisplayMode === 'dual'
                        ? 'bg-green-500 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                    }`}
                  >
                    دو چارت
                  </button>
                </>
              )}
            </div>
            
            {/* Location Filter and Time Filter - Right side on desktop */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-2 w-full md:w-auto order-1 md:order-1">
              {/* Location Filter - Filter by internal/external for agents (servers) */}
              <div className="flex items-center gap-1 sm:gap-2 bg-white rounded-lg border border-gray-200 p-1 overflow-x-auto">
                <button
                  onClick={() => setLocationFilter('all')}
                  className={`px-2 sm:px-3 py-1.5 text-xs sm:text-sm rounded-md transition-colors whitespace-nowrap flex-shrink-0 ${
                    locationFilter === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  همه
                </button>
                <button
                  onClick={() => setLocationFilter('internal')}
                  className={`px-2 sm:px-3 py-1.5 text-xs sm:text-sm rounded-md transition-colors whitespace-nowrap flex-shrink-0 ${
                    locationFilter === 'internal'
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  دیتاسنترهای داخلی
                </button>
                <button
                  onClick={() => setLocationFilter('external')}
                  className={`px-2 sm:px-3 py-1.5 text-xs sm:text-sm rounded-md transition-colors whitespace-nowrap flex-shrink-0 ${
                    locationFilter === 'external'
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  دیتاسنترهای خارجی
                </button>
              </div>
              
              {/* Date/Time Filter Button */}
              <button
                onClick={() => setIsDateTimeFilterOpen(true)}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
                  dateTimeFilter
                    ? 'bg-green-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span className="hidden sm:inline">فیلتر بازه زمانی</span>
                <span className="sm:hidden">زمان</span>
                {dateTimeFilter && (
                  <span className="bg-white bg-opacity-20 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs flex-shrink-0">
                    فعال
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Active Date/Time Filter Display */}
        {dateTimeFilter && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
              <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs sm:text-sm font-semibold text-green-800">فیلتر بازه زمانی فعال</div>
                  <div className="text-xs sm:text-sm text-green-600 break-words">
                    <span className="hidden sm:inline">تاریخ: {dateTimeFilter.date} | بازه: {dateTimeFilter.timeRange}</span>
                    <span className="sm:hidden">{dateTimeFilter.date} - {dateTimeFilter.timeRange}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setDateTimeFilter(null);
                  // Force refresh of all charts
                  setRefreshKey(Date.now());
                }}
                className="text-green-600 hover:text-green-800 text-xs sm:text-sm font-medium whitespace-nowrap flex-shrink-0 px-2 sm:px-0"
              >
                حذف فیلتر
              </button>
            </div>
          </div>
        )}

        {/* Global Filters */}
        <GlobalFilters
          selectedServers={globalSelectedServers}
          onSelectedServersChange={setGlobalSelectedServers}
          showServerFilter={true}
        />

        {/* Data Display */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          filteredAgents.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 text-lg">هیچ ایجنت فعالی یافت نشد</div>
            </div>
          ) : (
            <div className={`grid gap-6 ${
              viewMode === 'charts' 
                ? (chartDisplayMode === 'single' ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2')
                : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
            }`}>
              {filteredAgents.map((agent) => (
                viewMode === 'charts' ? (
                  <AgentChart 
                    key={`${agent.id}-${refreshKey}`} 
                    agent={agent} 
                    selectedServers={globalSelectedServers}
                    dateTimeFilter={dateTimeFilter}
                  />
                ) : (
                  <div key={agent.id} className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{agent.name}</h3>
                    <div className="text-sm text-gray-600">
                      <div>IP: {agent.server_ip}</div>
                      <div>وضعیت: {agent.is_active ? 'فعال' : 'غیرفعال'}</div>
                      <div>پورت: {agent.port}</div>
                    </div>
                  </div>
                )
              ))}
            </div>
          )
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white/80 backdrop-blur-sm border-t mt-16">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="text-center text-gray-500">
            <p>&copy; ۱۴۰۳ سیستم رادار مانیتورینگ. تمامی حقوق محفوظ است.</p>
          </div>
        </div>
      </footer>

      {/* Date/Time Filter Modal */}
      <DateTimeFilterModal
        isOpen={isDateTimeFilterOpen}
        onClose={() => setIsDateTimeFilterOpen(false)}
        onApplyFilter={handleDateTimeFilterApply}
      />
    </div>
  );
}
