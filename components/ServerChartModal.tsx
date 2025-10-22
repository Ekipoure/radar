'use client';

import { useState, useEffect } from 'react';
import { ServerWithStatus, MonitoringData } from '@/lib/types';

interface ServerChartModalProps {
  server: ServerWithStatus;
  isOpen: boolean;
  onClose: () => void;
}

type TimePeriod = '10min' | '1hour' | '24hours';

interface ChartDataPoint {
  time: string;
  responseTime: number;
  status: 'up' | 'down' | 'timeout' | 'error' | 'skipped';
}

export default function ServerChartModal({ server, isOpen, onClose }: ServerChartModalProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('1hour');
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRealTime, setIsRealTime] = useState(false);
  const [realTimeInterval, setRealTimeInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOpen && server) {
      fetchChartData();
    }
  }, [isOpen, server, selectedPeriod]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      // Store the current overflow value
      const originalOverflow = document.body.style.overflow;
      // Lock the body scroll
      document.body.style.overflow = 'hidden';
      
      // Cleanup function to restore scroll when modal closes
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Real-time updates effect
  useEffect(() => {
    if (isRealTime && isOpen && server) {
      const interval = setInterval(() => {
        fetchChartData();
      }, server.check_interval * 1000); // Convert to milliseconds
      
      setRealTimeInterval(interval);
      
      return () => {
        clearInterval(interval);
        setRealTimeInterval(null);
      };
    } else if (realTimeInterval) {
      clearInterval(realTimeInterval);
      setRealTimeInterval(null);
    }
  }, [isRealTime, isOpen, server]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (realTimeInterval) {
        clearInterval(realTimeInterval);
      }
    };
  }, [realTimeInterval]);

  const fetchChartData = async () => {
    // Only show loading spinner for manual updates, not real-time updates
    if (!isRealTime) {
      setLoading(true);
    }
    setError(null);
    
    try {
      const hours = selectedPeriod === '10min' ? 0.17 : selectedPeriod === '1hour' ? 1 : 24;
      
      // Get authentication token
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {};
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`/api/servers/${server.id}/monitoring?hours=${hours}`, { headers });
      
      if (!response.ok) {
        throw new Error('Failed to fetch monitoring data');
      }
      
      const data: MonitoringData[] = await response.json();
      
      // Process data for chart
      const processedData = data
        .sort((a, b) => new Date(a.checked_at).getTime() - new Date(b.checked_at).getTime())
        .map(item => ({
          time: new Date(item.checked_at).toLocaleTimeString('fa-IR', { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit',
            timeZone: 'Asia/Tehran'
          }),
          responseTime: item.response_time || 0,
          status: item.status
        }))
        .slice(0, 40); // Limit to maximum 35 candles
      
      setChartData(processedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      if (!isRealTime) {
        setLoading(false);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'up': return '#10B981';
      case 'down': return '#EF4444';
      case 'timeout': return '#F59E0B';
      case 'error': return '#8B5CF6';
      case 'skipped': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'up':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'down':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      case 'timeout':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'skipped':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getMaxResponseTime = () => {
    if (chartData.length === 0) return 100;
    return Math.max(...chartData.map(d => d.responseTime), 100);
  };

  const getAverageResponseTime = () => {
    if (chartData.length === 0) return 0;
    const validData = chartData.filter(d => d.status === 'up');
    if (validData.length === 0) return 0;
    return Math.round(validData.reduce((sum, d) => sum + d.responseTime, 0) / validData.length);
  };

  const getUptimePercentage = () => {
    if (chartData.length === 0) return 0;
    const upCount = chartData.filter(d => d.status === 'up').length;
    return Math.round((upCount / chartData.length) * 100);
  };

  const toggleRealTime = () => {
    const newRealTimeState = !isRealTime;
    setIsRealTime(newRealTimeState);
    
    // Show a brief notification
    if (newRealTimeState) {
      // Real-time enabled
      console.log(`Real-time monitoring enabled - updating every ${server.check_interval} seconds`);
    } else {
      // Real-time disabled
      console.log('Real-time monitoring disabled');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose}></div>
      
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 px-6 py-4 relative overflow-hidden">
          {/* Animated background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white to-transparent transform -skew-x-12 animate-pulse"></div>
          </div>
          
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center space-x-4">
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center border-4 border-white shadow-lg relative"
                style={{ backgroundColor: server.color }}
              >
                {/* Pulsing ring for active servers */}
                {server.current_status === 'up' && (
                  <div className="absolute inset-0 rounded-full border-2 border-white animate-ping opacity-75"></div>
                )}
                <svg className="h-6 w-6 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">{server.name}</h2>
                <p className="text-blue-100">{server.ip_address}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <div className={`w-2 h-2 rounded-full ${
                    server.current_status === 'up' ? 'bg-green-400' : 
                    server.current_status === 'down' ? 'bg-red-400' : 
                    server.current_status === 'timeout' ? 'bg-yellow-400' : 'bg-gray-400'
                  }`}></div>
                  <span className="text-blue-200 text-sm">
                    {server.current_status === 'up' ? 'آنلاین' : 
                     server.current_status === 'down' ? 'آفلاین' : 
                     server.current_status === 'timeout' ? 'تایم‌اوت' : 'خطا'}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors p-2 rounded-lg hover:bg-white hover:bg-opacity-20"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Time Period Selector */}
          <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-blue-50 border-b">
            <div className="flex flex-wrap gap-2 justify-center items-center">
              {[
                { key: '10min', label: '10 دقیقه گذشته', icon: '⏱️', color: 'from-orange-500 to-red-500' },
                { key: '1hour', label: '1 ساعت گذشته', icon: '🕐', color: 'from-blue-500 to-indigo-500' },
                { key: '24hours', label: '24 ساعت گذشته', icon: '📊', color: 'from-purple-500 to-pink-500' }
              ].map((period) => (
                <button
                  key={period.key}
                  onClick={() => setSelectedPeriod(period.key as TimePeriod)}
                  className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 ${
                    selectedPeriod === period.key
                      ? `bg-gradient-to-r ${period.color} text-white shadow-xl scale-105`
                      : 'bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-600 shadow-md hover:shadow-lg'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{period.icon}</span>
                    <span>{period.label}</span>
                  </div>
                </button>
              ))}
              
              {/* Real-time Toggle Button */}
              <div className="ml-4">
                <button
                  onClick={toggleRealTime}
                  className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 ${
                    isRealTime
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-xl scale-105'
                      : 'bg-white text-gray-700 hover:bg-green-50 hover:text-green-600 shadow-md hover:shadow-lg'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${isRealTime ? 'bg-white animate-pulse' : 'bg-gray-400'}`}></div>
                    <span className="text-lg">⚡</span>
                    <span>Real-time</span>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="px-6 py-4 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-4 text-white relative overflow-hidden animate-slide-up">
                <div className="absolute top-0 right-0 w-20 h-20 bg-white bg-opacity-10 rounded-full -translate-y-10 translate-x-10 animate-float"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm font-medium">میانگین Response Time</p>
                      <p className="text-3xl font-bold mt-1">{getAverageResponseTime()}ms</p>
                      <p className="text-green-200 text-xs mt-1">زمان پاسخ متوسط</p>
                    </div>
                    <div className="bg-white bg-opacity-20 rounded-lg p-3">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl p-4 text-white relative overflow-hidden animate-slide-up" style={{ animationDelay: '0.1s' }}>
                <div className="absolute top-0 right-0 w-20 h-20 bg-white bg-opacity-10 rounded-full -translate-y-10 translate-x-10 animate-float" style={{ animationDelay: '0.5s' }}></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm font-medium">درصد Uptime</p>
                      <p className="text-3xl font-bold mt-1">{getUptimePercentage()}%</p>
                      <p className="text-blue-200 text-xs mt-1">درصد دسترسی</p>
                    </div>
                    <div className="bg-white bg-opacity-20 rounded-lg p-3">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-4 text-white relative overflow-hidden animate-slide-up" style={{ animationDelay: '0.2s' }}>
                <div className="absolute top-0 right-0 w-20 h-20 bg-white bg-opacity-10 rounded-full -translate-y-10 translate-x-10 animate-float" style={{ animationDelay: '1s' }}></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-sm font-medium">تعداد چک‌ها</p>
                      <p className="text-3xl font-bold mt-1">{chartData.length}</p>
                      <p className="text-purple-200 text-xs mt-1">تعداد بررسی‌ها</p>
                    </div>
                    <div className="bg-white bg-opacity-20 rounded-lg p-3">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Chart Area */}
          <div className="px-6 py-4 bg-gray-50">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <div className="text-red-500 text-lg font-medium">{error}</div>
                <button
                  onClick={fetchChartData}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  تلاش مجدد
                </button>
              </div>
            ) : chartData.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-500 text-lg">داده‌ای برای نمایش وجود ندارد</div>
              </div>
            ) : (
              <div className="bg-white rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">نمودار Response Time</h3>
                  {isRealTime && (
                    <div className="flex items-center space-x-2 bg-green-100 px-3 py-1 rounded-full">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
                      <span className="text-xs text-green-700 font-medium">Real-time</span>
                    </div>
                  )}
                </div>
                
                {/* Chart */}
                <div className={`relative h-64 transition-all duration-300 ${isRealTime ? 'ring-2 ring-green-200 ring-opacity-50' : ''}`}>
                  <svg className="w-full h-full" viewBox="0 0 800 200">
                    {/* Grid lines */}
                    <defs>
                      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f3f4f6" strokeWidth="1"/>
                      </pattern>
                      <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3"/>
                        <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.05"/>
                      </linearGradient>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                    
                    {/* Area under the curve */}
                    {chartData.length > 1 && (
                      <path
                        d={`M 20,180 ${chartData.map((point, index) => {
                          const x = (index / (chartData.length - 1)) * 760 + 20;
                          const y = 180 - (point.responseTime / getMaxResponseTime()) * 160;
                          return `L ${x},${y}`;
                        }).join(' ')} L 780,180 Z`}
                        fill="url(#chartGradient)"
                      />
                    )}
                    
                    {/* Chart line */}
                    {chartData.length > 1 && (
                      <polyline
                        fill="none"
                        stroke="#3B82F6"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={chartData.map((point, index) => {
                          const x = (index / (chartData.length - 1)) * 760 + 20;
                          const y = 180 - (point.responseTime / getMaxResponseTime()) * 160;
                          return `${x},${y}`;
                        }).join(' ')}
                      />
                    )}
                    
                    {/* Data points with hover effect */}
                    {chartData.map((point, index) => {
                      const x = (index / (chartData.length - 1)) * 760 + 20;
                      const y = 180 - (point.responseTime / getMaxResponseTime()) * 160;
                      return (
                        <g key={index} className="cursor-pointer">
                          {/* Hover circle */}
                          <circle
                            cx={x}
                            cy={y}
                            r="8"
                            fill="transparent"
                            className="hover:fill-blue-100 transition-all duration-200"
                          />
                          {/* Data point */}
                          <circle
                            cx={x}
                            cy={y}
                            r="4"
                            fill={getStatusColor(point.status)}
                            stroke="white"
                            strokeWidth="2"
                            className="drop-shadow-sm hover:r-6 transition-all duration-200"
                          />
                          {/* Response time label */}
                          <text
                            x={x}
                            y={y - 12}
                            textAnchor="middle"
                            className="text-xs font-medium fill-gray-700 opacity-0 hover:opacity-100 transition-opacity duration-200"
                          >
                            {point.responseTime}ms
                          </text>
                          {/* Status indicator */}
                          <text
                            x={x}
                            y={y + 20}
                            textAnchor="middle"
                            className="text-xs font-medium fill-gray-500 opacity-0 hover:opacity-100 transition-opacity duration-200"
                          >
                            {point.status === 'up' ? 'آنلاین' : 
                             point.status === 'down' ? 'آفلاین' : 
                             point.status === 'timeout' ? 'تایم‌اوت' : 'خطا'}
                          </text>
                        </g>
                      );
                    })}
                    
                    {/* Y-axis labels */}
                    <text x="10" y="25" className="text-xs fill-gray-500 font-medium">0ms</text>
                    <text x="10" y="105" className="text-xs fill-gray-500 font-medium">{Math.round(getMaxResponseTime() / 2)}ms</text>
                    <text x="10" y="185" className="text-xs fill-gray-500 font-medium">{getMaxResponseTime()}ms</text>
                    
                    {/* X-axis time labels */}
                    {chartData.length > 0 && (
                      <>
                        <text x="20" y="195" className="text-xs fill-gray-500 font-medium" textAnchor="start">
                          {chartData[0].time}
                        </text>
                        {chartData.length > 1 && (
                          <text x="780" y="195" className="text-xs fill-gray-500 font-medium" textAnchor="end">
                            {chartData[chartData.length - 1].time}
                          </text>
                        )}
                      </>
                    )}
                  </svg>
                </div>
                
                {/* Legend */}
                <div className="flex justify-center space-x-6 mt-4">
                  {[
                    { status: 'up', label: 'آنلاین', color: '#10B981' },
                    { status: 'down', label: 'آفلاین', color: '#EF4444' },
                    { status: 'timeout', label: 'تایم‌اوت', color: '#F59E0B' },
                    { status: 'error', label: 'خطا', color: '#8B5CF6' }
                  ].map((item) => (
                    <div key={item.status} className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      ></div>
                      <span className="text-sm text-gray-600">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-blue-50 border-t">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">آخرین بروزرسانی:</span> {new Date().toLocaleString('fa-IR', { timeZone: 'Asia/Tehran' })}
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${isRealTime ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                  <span className="text-sm text-gray-600">
                    {isRealTime ? 'Real-time Active' : 'Live Data'}
                  </span>
                </div>
                {isRealTime && (
                  <div className="flex items-center space-x-2 bg-green-100 px-3 py-1 rounded-full">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
                    <span className="text-xs text-green-700 font-medium">
                      هر {server.check_interval} ثانیه
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={fetchChartData}
                  disabled={loading}
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>در حال بارگذاری...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>بروزرسانی</span>
                    </div>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
