'use client';

import { useState, useEffect } from 'react';
import { ServerWithStatus, UpdateServerData } from '@/lib/types';

interface EditServerModalProps {
  server: ServerWithStatus | null;
  onClose: () => void;
  onServerUpdated: () => void;
}

export default function EditServerModal({ server, onClose, onServerUpdated }: EditServerModalProps) {
  const [formData, setFormData] = useState<UpdateServerData>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (server) {
      setFormData({
        name: server.name,
        ip_address: server.ip_address,
        port: server.port,
        request_type: server.request_type,
        endpoint: server.endpoint,
        expected_status_code: server.expected_status_code,
        check_interval: server.check_interval,
        timeout: server.timeout,
        timeout_count: server.timeout_count || 3,
        server_group: server.server_group,
        color: server.color,
        is_active: server.is_active
      });
    }
  }, [server]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!server) return;
    
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

      const response = await fetch(`/api/servers/${server.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        onServerUpdated();
        onClose();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update server');
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

  if (!server) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="relative w-full max-w-md bg-white rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base sm:text-lg font-medium text-gray-900">
              Edit Server
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Server Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                className="input mt-1"
                value={formData.name || ''}
                onChange={handleChange}
                placeholder="e.g., Web Server 1"
              />
            </div>

            <div>
              <label htmlFor="ip_address" className="block text-sm font-medium text-gray-700">
                IP Address *
              </label>
              <input
                type="text"
                id="ip_address"
                name="ip_address"
                required
                className="input mt-1"
                value={formData.ip_address || ''}
                onChange={handleChange}
                placeholder="e.g., 192.168.1.1"
              />
            </div>

            <div>
              <label htmlFor="request_type" className="block text-sm font-medium text-gray-700">
                Request Type *
              </label>
              <select
                id="request_type"
                name="request_type"
                required
                className="select mt-1"
                value={formData.request_type || 'ping'}
                onChange={handleChange}
              >
                <option value="ping">Ping</option>
                <option value="http">HTTP</option>
                <option value="https">HTTPS</option>
                <option value="tcp">TCP</option>
              </select>
            </div>

            {(formData.request_type === 'http' || formData.request_type === 'https') && (
              <div>
                <label htmlFor="endpoint" className="block text-sm font-medium text-gray-700">
                  Endpoint
                </label>
                <input
                  type="text"
                  id="endpoint"
                  name="endpoint"
                  className="input mt-1"
                  value={formData.endpoint || ''}
                  onChange={handleChange}
                  placeholder="e.g., /api/health"
                />
              </div>
            )}

            {(formData.request_type === 'http' || formData.request_type === 'https') && (
              <div>
                <label htmlFor="expected_status_code" className="block text-sm font-medium text-gray-700">
                  Expected Status Code
                </label>
                <input
                  type="number"
                  id="expected_status_code"
                  name="expected_status_code"
                  className="input mt-1"
                  value={formData.expected_status_code || 200}
                  onChange={handleChange}
                  placeholder="200"
                />
              </div>
            )}

            {(formData.request_type === 'http' || formData.request_type === 'https' || formData.request_type === 'tcp') && (
              <div>
                <label htmlFor="port" className="block text-sm font-medium text-gray-700">
                  Port{formData.request_type === 'tcp' ? '' : ''}
                </label>
                <input
                  type="number"
                  id="port"
                  name="port"
                  className="input mt-1"
                  value={formData.port || ''}
                  onChange={handleChange}
                  placeholder={formData.request_type === 'tcp' ? "e.g., 22, 80, 443 (optional)" : "e.g., 80, 443, 22"}
                />
              </div>
            )}

            <div>
              <label htmlFor="check_interval" className="block text-sm font-medium text-gray-700">
                Check Interval (seconds) *
              </label>
              <input
                type="number"
                id="check_interval"
                name="check_interval"
                required
                min="10"
                className="input mt-1"
                value={formData.check_interval || 60}
                onChange={handleChange}
                placeholder="60"
              />
            </div>

            <div>
              <label htmlFor="timeout" className="block text-sm font-medium text-gray-700">
                Timeout (milliseconds) *
              </label>
              <input
                type="number"
                id="timeout"
                name="timeout"
                required
                min="1000"
                className="input mt-1"
                value={formData.timeout || 5000}
                onChange={handleChange}
                placeholder="5000"
              />
            </div>

            <div>
              <label htmlFor="timeout_count" className="block text-sm font-medium text-gray-700">
                تعداد تایم‌اوت متوالی برای آفلاین شدن *
              </label>
              <input
                type="number"
                id="timeout_count"
                name="timeout_count"
                required
                min="1"
                max="100"
                className="input mt-1"
                value={formData.timeout_count || 3}
                onChange={handleChange}
                placeholder="e.g., 10"
              />
              <p className="mt-1 text-xs text-gray-500">
                اگر سرور به این تعداد بار به صورت متوالی تایم‌اوت شود، کندل بعدی به عنوان آفلاین تشخیص داده می‌شود
              </p>
            </div>

            <div>
              <label htmlFor="server_group" className="block text-sm font-medium text-gray-700">
                Server Group *
              </label>
              <select
                id="server_group"
                name="server_group"
                required
                className="select mt-1"
                value={formData.server_group || 'iranian'}
                onChange={handleChange}
              >
                <option value="iranian">Iranian</option>
                <option value="global">Global</option>
              </select>
            </div>

            <div>
              <label htmlFor="color" className="block text-sm font-medium text-gray-700">
                Color *
              </label>
              <div className="flex items-center space-x-2 mt-1">
                <input
                  type="color"
                  id="color"
                  name="color"
                  className="h-10 w-16 rounded border border-gray-300"
                  value={formData.color || '#3B82F6'}
                  onChange={handleChange}
                />
                <input
                  type="text"
                  className="input flex-1"
                  value={formData.color || '#3B82F6'}
                  onChange={handleChange}
                  placeholder="#3B82F6"
                />
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                name="is_active"
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                checked={formData.is_active || false}
                onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
              />
              <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                Active
              </label>
            </div>

            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}

            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary text-sm sm:text-base"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary text-sm sm:text-base"
                disabled={loading}
              >
                {loading ? 'Updating...' : 'Update Server'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
