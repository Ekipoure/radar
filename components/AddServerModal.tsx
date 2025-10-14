'use client';

import { useState } from 'react';
import { CreateServerData } from '@/lib/types';

interface AddServerModalProps {
  onClose: () => void;
  onServerAdded: () => void;
}

export default function AddServerModal({ onClose, onServerAdded }: AddServerModalProps) {
  const [formData, setFormData] = useState<CreateServerData>({
    name: '',
    ip_address: '',
    port: undefined,
    request_type: 'ping',
    endpoint: '',
    expected_status_code: 200,
    check_interval: 60,
    timeout: 5000,
    server_group: 'iranian',
    color: '#3B82F6'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/servers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        onServerAdded();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create server');
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
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Add New Server
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
                value={formData.name}
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
                value={formData.ip_address}
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
                value={formData.request_type}
                onChange={handleChange}
              >
                <option value="ping">Ping</option>
                <option value="http">HTTP</option>
                <option value="https">HTTPS</option>
                <option value="tcp">TCP</option>
              </select>
            </div>

            {(formData.request_type === 'http' || formData.request_type === 'https') && (
              <>
                <div>
                  <label htmlFor="port" className="block text-sm font-medium text-gray-700">
                    Port
                  </label>
                  <input
                    type="number"
                    id="port"
                    name="port"
                    className="input mt-1"
                    value={formData.port || ''}
                    onChange={handleChange}
                    placeholder="e.g., 80, 443"
                  />
                </div>

                <div>
                  <label htmlFor="endpoint" className="block text-sm font-medium text-gray-700">
                    Endpoint
                  </label>
                  <input
                    type="text"
                    id="endpoint"
                    name="endpoint"
                    className="input mt-1"
                    value={formData.endpoint}
                    onChange={handleChange}
                    placeholder="e.g., /health, /status"
                  />
                </div>

                <div>
                  <label htmlFor="expected_status_code" className="block text-sm font-medium text-gray-700">
                    Expected Status Code
                  </label>
                  <input
                    type="number"
                    id="expected_status_code"
                    name="expected_status_code"
                    className="input mt-1"
                    value={formData.expected_status_code || ''}
                    onChange={handleChange}
                    placeholder="e.g., 200"
                  />
                </div>
              </>
            )}

            {formData.request_type === 'tcp' && (
              <div>
                <label htmlFor="port" className="block text-sm font-medium text-gray-700">
                  Port *
                </label>
                <input
                  type="number"
                  id="port"
                  name="port"
                  required
                  className="input mt-1"
                  value={formData.port || ''}
                  onChange={handleChange}
                  placeholder="e.g., 22, 80, 443"
                />
              </div>
            )}

            <div>
              <label htmlFor="server_group" className="block text-sm font-medium text-gray-700">
                Server Group *
              </label>
              <select
                id="server_group"
                name="server_group"
                required
                className="select mt-1"
                value={formData.server_group}
                onChange={handleChange}
              >
                <option value="iranian">Iranian</option>
                <option value="global">Global</option>
              </select>
            </div>

            <div>
              <label htmlFor="color" className="block text-sm font-medium text-gray-700">
                Server Color *
              </label>
              <div className="mt-1 flex items-center space-x-3">
                <input
                  type="color"
                  id="color"
                  name="color"
                  required
                  className="h-10 w-16 rounded border border-gray-300 cursor-pointer"
                  value={formData.color}
                  onChange={handleChange}
                />
                <div className="flex flex-wrap gap-2">
                  {[
                    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
                    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
                  ].map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 ${
                        formData.color === color ? 'border-gray-800' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData(prev => ({ ...prev, color }))}
                      title={color}
                    />
                  ))}
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Choose a color to identify this server in the dashboard
              </p>
            </div>

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
                max="3600"
                className="input mt-1"
                value={formData.check_interval}
                onChange={handleChange}
                placeholder="e.g., 60"
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
                max="30000"
                className="input mt-1"
                value={formData.timeout}
                onChange={handleChange}
                placeholder="e.g., 5000"
              />
            </div>

            {error && (
              <div className="bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
              >
                {loading ? 'Adding...' : 'Add Server'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
