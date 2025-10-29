'use client';

import { useState, useEffect } from 'react';
import { CreateAgentData } from '@/lib/types';

interface AddAgentModalProps {
  onClose: () => void;
  onAgentAdded: () => void;
}

export default function AddAgentModal({ onClose, onAgentAdded }: AddAgentModalProps) {
  const [formData, setFormData] = useState<CreateAgentData>({
    name: '',
    server_ip: '',
    username: '',
    repo_url: '',
    location: 'internal',
    port: 3000
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Lock body scroll when modal is open
  useEffect(() => {
    // Store the current overflow value
    const originalOverflow = document.body.style.overflow;
    // Lock the body scroll
    document.body.style.overflow = 'hidden';
    
    // Cleanup function to restore scroll when modal closes
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Get authentication token
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/agents', {
        method: 'POST',
        headers,
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        onAgentAdded();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create agent');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value ? parseInt(value) : undefined) : value
    }));
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="relative w-full max-w-md bg-white rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h3 className="text-base sm:text-lg font-medium text-gray-900">
              افزودن ایجنت جدید
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                نام ایجنت *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                className="input mt-1"
                value={formData.name}
                onChange={handleChange}
                placeholder="مثال: ایجنت تولیدی"
              />
            </div>

            <div>
              <label htmlFor="server_ip" className="block text-sm font-medium text-gray-700">
                آدرس IP سرور *
              </label>
              <input
                type="text"
                id="server_ip"
                name="server_ip"
                required
                className="input mt-1"
                value={formData.server_ip}
                onChange={handleChange}
                placeholder="مثال: 192.168.1.100 یا your-server.com"
              />
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                نام کاربری *
              </label>
              <input
                type="text"
                id="username"
                name="username"
                required
                className="input mt-1"
                value={formData.username}
                onChange={handleChange}
                placeholder="مثال: user یا root"
              />
            </div>

            <div>
              <label htmlFor="repo_url" className="block text-sm font-medium text-gray-700">
                آدرس مخزن *
              </label>
              <input
                type="url"
                id="repo_url"
                name="repo_url"
                required
                className="input mt-1"
                value={formData.repo_url}
                onChange={handleChange}
                placeholder="https://github.com/user/repo.git"
              />
            </div>

            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                مکان *
              </label>
              <select
                id="location"
                name="location"
                required
                className="select mt-1"
                value={formData.location}
                onChange={handleChange}
              >
                <option value="internal">داخلی</option>
                <option value="external">خارجی</option>
              </select>
            </div>

            <div>
              <label htmlFor="port" className="block text-sm font-medium text-gray-700">
                پورت
              </label>
              <input
                type="number"
                id="port"
                name="port"
                className="input mt-1"
                value={formData.port || ''}
                onChange={handleChange}
                placeholder="مثال: 3000"
              />
              <p className="mt-1 text-xs text-gray-500">
                پورت پیش‌فرض: 3000
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4" dir="ltr">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary text-sm sm:text-base"
              >
                انصراف
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary text-sm sm:text-base"
              >
                {loading ? 'در حال افزودن...' : 'افزودن ایجنت'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

