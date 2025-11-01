'use client';

import { useState, useEffect } from 'react';

interface SiteSettings {
  header_title: string | null;
  header_subtitle: string | null;
  header_tagline: string | null;
  footer_text: string | null;
  footer_enabled: boolean;
}

interface SiteIdentityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export default function SiteIdentityModal({ isOpen, onClose, onUpdated }: SiteIdentityModalProps) {
  const [formData, setFormData] = useState<SiteSettings>({
    header_title: '',
    header_subtitle: '',
    header_tagline: '',
    footer_text: '',
    footer_enabled: true
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Fetch current settings when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  const fetchSettings = async () => {
    setFetching(true);
    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/site-settings', { headers });
      if (response.ok) {
        const data = await response.json();
        setFormData({
          header_title: data.settings.header_title || '',
          header_subtitle: data.settings.header_subtitle || '',
          header_tagline: data.settings.header_tagline || '',
          footer_text: data.settings.footer_text || '',
          footer_enabled: data.settings.footer_enabled !== false
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/site-settings', {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          header_title: formData.header_title || null,
          header_subtitle: formData.header_subtitle || null,
          header_tagline: formData.header_tagline || null,
          footer_text: formData.footer_text || null,
          footer_enabled: formData.footer_enabled
        }),
      });

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          onUpdated();
          onClose();
        }, 1000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'خطا در به‌روزرسانی تنظیمات');
      }
    } catch (error) {
      setError('خطای ارتباط با سرور. لطفاً دوباره تلاش کنید.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      footer_enabled: e.target.checked
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center p-4 z-50" dir="rtl">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-5 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white">مدیریت هویت سایت</h3>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {fetching ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Header Section */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-5 border border-blue-100">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                  متن هدر سایت
                </h4>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="header_title" className="block text-sm font-medium text-gray-700 mb-2">
                      عنوان اصلی
                    </label>
                    <input
                      type="text"
                      id="header_title"
                      name="header_title"
                      value={formData.header_title}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                      placeholder="رادار مانیتورینگ"
                    />
                    <p className="mt-1 text-xs text-gray-500">اگر خالی باشد، نمایش داده نمی‌شود</p>
                  </div>

                  <div>
                    <label htmlFor="header_subtitle" className="block text-sm font-medium text-gray-700 mb-2">
                      زیرعنوان
                    </label>
                    <input
                      type="text"
                      id="header_subtitle"
                      name="header_subtitle"
                      value={formData.header_subtitle}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                      placeholder="سیستم نظارت بر سرورها"
                    />
                    <p className="mt-1 text-xs text-gray-500">اگر خالی باشد، نمایش داده نمی‌شود</p>
                  </div>

                  <div>
                    <label htmlFor="header_tagline" className="block text-sm font-medium text-gray-700 mb-2">
                      شعار
                    </label>
                    <input
                      type="text"
                      id="header_tagline"
                      name="header_tagline"
                      value={formData.header_tagline}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                      placeholder="پایش هوشمند، تصمیم مطمئن"
                    />
                    <p className="mt-1 text-xs text-gray-500">اگر خالی باشد، نمایش داده نمی‌شود</p>
                  </div>
                </div>
              </div>

              {/* Footer Section */}
              <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-5 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    متن فوتر
                  </h4>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.footer_enabled}
                      onChange={handleCheckboxChange}
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">نمایش فوتر</span>
                  </label>
                </div>

                <div>
                  <label htmlFor="footer_text" className="block text-sm font-medium text-gray-700 mb-2">
                    متن کپی‌رایت
                  </label>
                  <textarea
                    id="footer_text"
                    name="footer_text"
                    rows={3}
                    value={formData.footer_text}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm resize-none"
                    placeholder="© ۱۴۰۳ سیستم رادار مانیتورینگ. تمامی حقوق محفوظ است."
                  />
                  <p className="mt-1 text-xs text-gray-500">اگر خالی باشد یا فوتر غیرفعال باشد، فوتر نمایش داده نمی‌شود</p>
                </div>
              </div>

              {/* Messages */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  تنظیمات با موفقیت به‌روزرسانی شد
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      در حال ذخیره...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      ذخیره تنظیمات
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

