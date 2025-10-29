'use client';

import { useState, useEffect } from 'react';
import { Banner } from '@/lib/types';

interface BannerTableProps {
  onBannerUpdated: () => void;
  onBannerDeleted: () => void;
  triggerAddModal?: boolean;
}

export default function BannerTable({ onBannerUpdated, onBannerDeleted, triggerAddModal }: BannerTableProps) {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Watch for external trigger to open add modal
  useEffect(() => {
    if (triggerAddModal) {
      setShowAddModal(true);
    }
  }, [triggerAddModal]);

  const fetchBanners = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : undefined;

      const response = await fetch('/api/banners', { headers });
      if (response.ok) {
        const data = await response.json();
        setBanners(data.banners);
      }
    } catch (error) {
      console.error('Error fetching banners:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const handleToggleActive = async (banner: Banner) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/banners/${banner.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_active: !banner.is_active })
      });

      if (response.ok) {
        onBannerUpdated();
        fetchBanners();
      }
    } catch (error) {
      console.error('Error updating banner:', error);
    }
  };

  const handleDelete = async (banner: Banner) => {
    if (!confirm('آیا مطمئن هستید که می‌خواهید این بنر را حذف کنید؟')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/banners/${banner.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        onBannerDeleted();
        fetchBanners();
      }
    } catch (error) {
      console.error('Error deleting banner:', error);
    }
  };

  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h3 className="text-base sm:text-lg font-medium text-gray-900">مدیریت بنرها</h3>
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full sm:w-auto bg-blue-600 text-white px-3 py-2 sm:px-4 rounded-md hover:bg-blue-700 transition-colors text-sm sm:text-base"
          >
            افزودن بنر جدید
          </button>
        </div>
      </div>

      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <table className="min-w-full divide-y divide-gray-200" style={{ minWidth: '900px' }}>
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                متن بنر
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                سرعت
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                رنگ متن
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                رنگ پس‌زمینه
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                اندازه فونت
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                وضعیت
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                عملیات
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {banners.map((banner) => (
              <tr key={banner.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 max-w-xs truncate">
                    {banner.text}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {banner.speed} ثانیه
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div
                      className="w-4 h-4 rounded border border-gray-300 ml-2"
                      style={{ backgroundColor: banner.color }}
                    ></div>
                    <span className="text-sm text-gray-900">{banner.color}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div
                      className="w-4 h-4 rounded border border-gray-300 ml-2"
                      style={{ backgroundColor: banner.background_color }}
                    ></div>
                    <span className="text-sm text-gray-900">{banner.background_color}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {banner.font_size}px
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      banner.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {banner.is_active ? 'فعال' : 'غیرفعال'}
                  </span>
                </td>
                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2">
                    <button
                      onClick={() => handleToggleActive(banner)}
                      className={`px-2 sm:px-3 py-1 rounded text-xs whitespace-nowrap ${
                        banner.is_active
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {banner.is_active ? 'غیرفعال' : 'فعال'}
                    </button>
                    <button
                      onClick={() => handleEdit(banner)}
                      className="px-2 sm:px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 whitespace-nowrap"
                    >
                      ویرایش
                    </button>
                    <button
                      onClick={() => handleDelete(banner)}
                      className="px-2 sm:px-3 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200 whitespace-nowrap"
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

      {banners.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          هیچ بنری یافت نشد
        </div>
      )}

      {showAddModal && (
        <AddBannerModal
          onClose={() => setShowAddModal(false)}
          onBannerAdded={() => {
            setShowAddModal(false);
            onBannerUpdated();
            fetchBanners();
          }}
        />
      )}

      {editingBanner && (
        <EditBannerModal
          banner={editingBanner}
          onClose={() => setEditingBanner(null)}
          onBannerUpdated={() => {
            setEditingBanner(null);
            onBannerUpdated();
            fetchBanners();
          }}
        />
      )}
    </div>
  );
}

// Add Banner Modal Component
function AddBannerModal({ onClose, onBannerAdded }: { onClose: () => void; onBannerAdded: () => void }) {
  const [formData, setFormData] = useState({
    text: '',
    speed: 10,
    color: '#FFFFFF',
    background_color: '#3B82F6',
    font_size: 24
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/banners', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        onBannerAdded();
      } else {
        const error = await response.json();
        alert(error.error || 'خطا در ایجاد بنر');
      }
    } catch (error) {
      console.error('Error creating banner:', error);
      alert('خطا در ایجاد بنر');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-4">افزودن بنر جدید</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              متن بنر
            </label>
            <textarea
              value={formData.text}
              onChange={(e) => setFormData({ ...formData, text: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                سرعت حرکت (ثانیه)
              </label>
              <input
                type="number"
                value={formData.speed}
                onChange={(e) => setFormData({ ...formData, speed: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="3"
                max="30"
                placeholder="زمان کامل حرکت متن از چپ به راست (از اولین پیکسل تا آخرین پیکسل)"
              />
              <p className="text-xs text-gray-500 mt-1 hidden sm:block">زمان کامل حرکت متن از سمت چپ به سمت راست صفحه (از اولین پیکسل تا آخرین پیکسل)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                اندازه فونت
              </label>
              <input
                type="number"
                value={formData.font_size}
                onChange={(e) => setFormData({ ...formData, font_size: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="12"
                max="48"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                رنگ متن
              </label>
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-full h-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1 hidden sm:block">زمان کامل حرکت متن از سمت چپ به سمت راست صفحه (از اولین پیکسل تا آخرین پیکسل)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                رنگ پس‌زمینه
              </label>
              <input
                type="color"
                value={formData.background_color}
                onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                className="w-full h-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 text-sm sm:text-base"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm sm:text-base"
            >
              {loading ? 'در حال ایجاد...' : 'ایجاد بنر'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit Banner Modal Component
function EditBannerModal({ 
  banner, 
  onClose, 
  onBannerUpdated 
}: { 
  banner: Banner; 
  onClose: () => void; 
  onBannerUpdated: () => void; 
}) {
  const [formData, setFormData] = useState({
    text: banner.text,
    speed: banner.speed,
    color: banner.color,
    background_color: banner.background_color,
    font_size: banner.font_size,
    is_active: banner.is_active
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/banners/${banner.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        onBannerUpdated();
      } else {
        const error = await response.json();
        alert(error.error || 'خطا در به‌روزرسانی بنر');
      }
    } catch (error) {
      console.error('Error updating banner:', error);
      alert('خطا در به‌روزرسانی بنر');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-4">ویرایش بنر</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              متن بنر
            </label>
            <textarea
              value={formData.text}
              onChange={(e) => setFormData({ ...formData, text: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                سرعت حرکت (ثانیه)
              </label>
              <input
                type="number"
                value={formData.speed}
                onChange={(e) => setFormData({ ...formData, speed: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="3"
                max="30"
                placeholder="زمان کامل حرکت متن از چپ به راست (از اولین پیکسل تا آخرین پیکسل)"
              />
              <p className="text-xs text-gray-500 mt-1">زمان کامل حرکت متن از سمت چپ به سمت راست صفحه (از اولین پیکسل تا آخرین پیکسل)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                اندازه فونت
              </label>
              <input
                type="number"
                value={formData.font_size}
                onChange={(e) => setFormData({ ...formData, font_size: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="12"
                max="48"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                رنگ متن
              </label>
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-full h-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">زمان کامل حرکت متن از سمت چپ به سمت راست صفحه (از اولین پیکسل تا آخرین پیکسل)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                رنگ پس‌زمینه
              </label>
              <input
                type="color"
                value={formData.background_color}
                onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                className="w-full h-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="ml-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-700">فعال</span>
            </label>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 text-sm sm:text-base"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm sm:text-base"
            >
              {loading ? 'در حال به‌روزرسانی...' : 'به‌روزرسانی بنر'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
