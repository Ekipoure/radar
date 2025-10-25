'use client';

import { useState, useEffect } from 'react';
import { Ad } from '@/lib/types';

interface AdTableProps {
  onAdUpdated: () => void;
  onAdDeleted: () => void;
}

export default function AdTable({ onAdUpdated, onAdDeleted }: AdTableProps) {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAds = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : undefined;

      const response = await fetch('/api/ads', { headers });
      if (response.ok) {
        const data = await response.json();
        setAds(data.ads);
      }
    } catch (error) {
      console.error('Error fetching ads:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAds();
  }, []);

  const handleToggleActive = async (ad: Ad) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/ads/${ad.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_active: !ad.is_active })
      });

      if (response.ok) {
        onAdUpdated();
        fetchAds();
      }
    } catch (error) {
      console.error('Error updating ad:', error);
    }
  };

  const handleDelete = async (ad: Ad) => {
    if (!confirm('آیا مطمئن هستید که می‌خواهید این تبلیغ را حذف کنید؟')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/ads/${ad.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        onAdDeleted();
        fetchAds();
      }
    } catch (error) {
      console.error('Error deleting ad:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">مدیریت تبلیغات</h3>
      </div>
      
      {ads.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          هیچ تبلیغی یافت نشد
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 table-fixed">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-20 px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  تصویر
                </th>
                <th className="w-32 px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  عنوان
                </th>
                <th className="w-48 px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  لینک
                </th>
                <th className="w-24 px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  وضعیت
                </th>
                <th className="w-32 px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  تاریخ ایجاد
                </th>
                <th className="w-40 px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  عملیات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {ads.map((ad) => (
                <tr key={ad.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 text-right">
                    <div className="flex justify-end">
                      <img
                        src={ad.image_url}
                        alt={ad.title}
                        className="h-12 w-16 object-cover rounded"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA2NCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjQ4IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yNCAxNkwyOCAyMEwyNCAyNEwyMCAyMEwyNCAxNloiIGZpbGw9IiM5Q0EzQUYiLz4KPHBhdGggZD0iTTQwIDE2TDQ0IDIwTDQwIDI0TDM2IDIwTDQwIDE2WiIgZmlsbD0iIzlDQTNBRiIvPgo8cGF0aCBkPSJNMjQgMzJMMjggMzZMMjQgNDBMMjAgMzZMMjQgMzJaIiBmaWxsPSIjOUNBM0FGIi8+CjxwYXRoIGQ9Ik00MCAzMkw0NCAzNkw0MCA0MEwzNiAzNkw0MCAzMloiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+';
                        }}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="text-sm font-medium text-gray-900 truncate">{ad.title}</div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    {ad.link_url ? (
                      <a
                        href={ad.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 truncate block"
                      >
                        {ad.link_url}
                      </a>
                    ) : (
                      <span className="text-sm text-gray-500">بدون لینک</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex justify-end">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          ad.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {ad.is_active ? 'فعال' : 'غیرفعال'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="text-sm text-gray-500">{new Date(ad.created_at).toLocaleDateString('fa-IR')}</div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 text-xs justify-end">
                      <button
                        onClick={() => handleToggleActive(ad)}
                        className={`px-2 py-1 rounded ${
                          ad.is_active
                            ? 'text-red-600 hover:text-red-900 hover:bg-red-50'
                            : 'text-green-600 hover:text-green-900 hover:bg-green-50'
                        }`}
                      >
                        {ad.is_active ? 'غیرفعال کردن' : 'فعال کردن'}
                      </button>
                      <button
                        onClick={() => handleDelete(ad)}
                        className="px-2 py-1 rounded text-red-600 hover:text-red-900 hover:bg-red-50"
                      >
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
