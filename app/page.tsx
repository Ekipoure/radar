'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AgentChart from '@/components/AgentChart';
import GlobalFilters from '@/components/GlobalFilters';
import AdDisplay from '@/components/AdDisplay';
import { Agent } from '@/lib/types';

export default function Home() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'charts' | 'cards'>('charts');
  const [chartDisplayMode, setChartDisplayMode] = useState<'single' | 'dual'>('dual');
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Global filter state
  const [globalTimeRange, setGlobalTimeRange] = useState(6);
  const [globalSelectedServers, setGlobalSelectedServers] = useState<number[]>([]);

  // Update current time every minute
  useEffect(() => {
    // Set initial time on client side only
    setCurrentTime(new Date());
    
    const timer = setInterval(() => {
      setCurrentTime(new Date());
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
        
        setLastUpdate(new Date());
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
    
    // Auto-refresh data every 30 seconds (silent)
    const interval = setInterval(() => {
      fetchData(true);
    }, 30000);
    
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
          
          setLastUpdate(new Date());
        } catch (error) {
          console.error('Failed to refresh data:', error);
        }
      };
      
      fetchData();
    }
  }, [agents.map(a => `${a.id}-${a.current_status}`).join(',')]);

  const filteredAgents = agents;

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50" dir="rtl">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">رادار مانیتورینگ</h1>
                  <p className="text-sm text-gray-600">سیستم نظارت بر سرورها</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="سیستم فعال - داده‌ها به صورت خودکار به‌روزرسانی می‌شوند"></div>
                  <span className="text-xs" suppressHydrationWarning>آخرین به‌روزرسانی: {lastUpdate ? lastUpdate.toLocaleString('fa-IR', {
                    timeZone: 'Asia/Tehran',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  }) : 'در حال بارگذاری...'}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1" suppressHydrationWarning>
                  {currentTime ? currentTime.toLocaleString('fa-IR', {
                    timeZone: 'Asia/Tehran',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : 'در حال بارگذاری...'}
                </div>
              </div>
              <Link
                href="/dashboard"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                پنل مدیریت
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Advertisement Section */}
        <div className="mb-8">
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
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex gap-2">
            <button
              onClick={() => setChartType('agents')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                true
                  ? 'bg-purple-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              چارت‌های ایجنت
            </button>
          </div>
          
          
          <div className="flex gap-2 mr-auto">
            <button
              onClick={() => setViewMode('charts')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'charts'
                  ? 'bg-purple-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              نمایش چارت
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'cards'
                  ? 'bg-purple-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              نمایش کارت
            </button>
            
            {/* Chart Display Mode Toggle - Only show when charts view is selected */}
            {viewMode === 'charts' && (
              <div className="flex gap-2 mr-4">
                <button
                  onClick={() => setChartDisplayMode('single')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    chartDisplayMode === 'single'
                      ? 'bg-green-500 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  تک چارت
                </button>
                <button
                  onClick={() => setChartDisplayMode('dual')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    chartDisplayMode === 'dual'
                      ? 'bg-green-500 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  دو چارت
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Global Filters */}
        <GlobalFilters
          timeRange={globalTimeRange}
          onTimeRangeChange={setGlobalTimeRange}
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
                    key={agent.id} 
                    agent={agent} 
                    timeRange={globalTimeRange}
                    selectedServers={globalSelectedServers}
                  />
                ) : (
                  <div key={agent.id} className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{agent.name}</h3>
                    <div className="text-sm text-gray-600">
                      <div>IP: {agent.server_ip}</div>
                      <div>وضعیت: {agent.current_status === 'active' ? 'فعال' : 'غیرفعال'}</div>
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
    </div>
  );
}
