'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ServerChart from '@/components/ServerChart';
import ServerInfoCard from '@/components/ServerInfoCard';
import { ServerWithStatus } from '@/lib/types';

export default function Home() {
  const [servers, setServers] = useState<ServerWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'iranian' | 'global'>('all');
  const [viewMode, setViewMode] = useState<'charts' | 'cards'>('charts');
  const [chartDisplayMode, setChartDisplayMode] = useState<'single' | 'dual'>('dual');
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

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

    const fetchServers = async (isRefresh = false) => {
      try {
        // Only show loading on initial load, not on refreshes
        if (!isRefresh) {
          setLoading(true);
        }
        
        const response = await fetch('/api/public/servers');
        console.log('Servers API response status:', response.status);
        if (response.ok) {
          const data = await response.json();
          console.log('Servers data received:', data);
          setServers(data.servers);
          setLastUpdate(new Date());
        } else {
          const errorText = await response.text();
          console.error('Servers API error:', response.status, errorText);
        }
      } catch (error) {
        console.error('Failed to fetch servers:', error);
      } finally {
        if (!isRefresh) {
          setLoading(false);
          setIsInitialLoad(false);
        }
      }
    };

    // Initialize monitoring service and then fetch servers
    const initializeAndFetch = async () => {
      await initializeMonitoring();
      await fetchServers();
    };

    // Initial load
    initializeAndFetch();
    
    // Auto-refresh servers every 30 seconds (silent)
    const interval = setInterval(() => {
      fetchServers(true);
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Force refresh when servers data changes
  useEffect(() => {
    if (!isInitialLoad && servers.length > 0) {
      const fetchServers = async () => {
        try {
          const response = await fetch('/api/public/servers');
          if (response.ok) {
            const data = await response.json();
            setServers(data.servers);
            setLastUpdate(new Date());
          }
        } catch (error) {
          console.error('Failed to refresh servers:', error);
        }
      };
      
      fetchServers();
    }
  }, [servers.map(s => `${s.id}-${s.current_status}-${s.response_time}-${s.last_checked}`).join(',')]);

  const filteredServers = servers.filter(server => {
    if (filter === 'all') return true;
    return server.server_group === filter;
  });

  const getServerGroupStats = () => {
    const iranian = servers.filter(s => s.server_group === 'iranian');
    const global = servers.filter(s => s.server_group === 'global');
    const up = servers.filter(s => s.current_status === 'up');
    const down = servers.filter(s => s.current_status && s.current_status !== 'up');

    return {
      total: servers.length,
      iranian: iranian.length,
      global: global.length,
      up: up.length,
      down: down.length
    };
  };

  const stats = getServerGroupStats();

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
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 text-center transition-all duration-300 ease-in-out">
            <div className="text-3xl font-bold text-gray-900 transition-all duration-500 ease-in-out">{stats.total}</div>
            <div className="text-sm text-gray-600">کل سرورها</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 text-center transition-all duration-300 ease-in-out">
            <div className="text-3xl font-bold text-green-600 transition-all duration-500 ease-in-out">{stats.up}</div>
            <div className="text-sm text-gray-600">آنلاین</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 text-center transition-all duration-300 ease-in-out">
            <div className="text-3xl font-bold text-red-600 transition-all duration-500 ease-in-out">{stats.down}</div>
            <div className="text-sm text-gray-600">آفلاین</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 text-center transition-all duration-300 ease-in-out">
            <div className="text-3xl font-bold text-blue-600 transition-all duration-500 ease-in-out">{stats.iranian}</div>
            <div className="text-sm text-gray-600">داخلی</div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              همه سرورها
            </button>
            <button
              onClick={() => setFilter('iranian')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'iranian'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              سرورهای داخلی
            </button>
            <button
              onClick={() => setFilter('global')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'global'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              سرورهای خارجی
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

        {/* Servers Display */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredServers.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg">هیچ سروری یافت نشد</div>
          </div>
        ) : (
          <div className={`grid gap-6 ${
            viewMode === 'charts' 
              ? (chartDisplayMode === 'single' ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2')
              : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
          }`}>
            {filteredServers.map((server) => (
              viewMode === 'charts' ? (
                <ServerChart key={server.id} server={server} />
              ) : (
                <ServerInfoCard key={server.id} server={server} />
              )
            ))}
          </div>
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
