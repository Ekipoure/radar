'use client';

import { useState, useEffect } from 'react';

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
}

interface PerformanceData {
  totalMetrics: number;
  avgResponseTime: number;
  slowestOperations: PerformanceMetric[];
  allMetrics: PerformanceMetric[];
}

export default function PerformanceMonitor() {
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchPerformanceData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/performance');
      if (response.ok) {
        const data = await response.json();
        setPerformanceData(data);
      }
    } catch (error) {
      console.error('Error fetching performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearMetrics = async () => {
    try {
      await fetch('/api/performance', { method: 'DELETE' });
      await fetchPerformanceData();
    } catch (error) {
      console.error('Error clearing metrics:', error);
    }
  };

  useEffect(() => {
    fetchPerformanceData();
    const interval = setInterval(fetchPerformanceData, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  if (!performanceData) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6" dir="rtl">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-gray-900">عملکرد سیستم</h3>
        <button
          onClick={clearMetrics}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
        >
          پاک کردن آمار
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{performanceData.totalMetrics}</div>
          <div className="text-sm text-gray-600">تعداد عملیات</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            {performanceData.avgResponseTime.toFixed(2)}ms
          </div>
          <div className="text-sm text-gray-600">میانگین زمان پاسخ</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">
            {performanceData.slowestOperations.length}
          </div>
          <div className="text-sm text-gray-600">عملیات کند</div>
        </div>
      </div>

      {performanceData.slowestOperations.length > 0 && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">کندترین عملیات</h4>
          <div className="space-y-2">
            {performanceData.slowestOperations.slice(0, 5).map((operation, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">{operation.name}</span>
                <span className="text-sm font-bold text-red-600">
                  {operation.duration?.toFixed(2)}ms
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-center">
        <button
          onClick={fetchPerformanceData}
          disabled={loading}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
        >
          {loading ? 'در حال بارگذاری...' : 'به‌روزرسانی'}
        </button>
      </div>
    </div>
  );
}
