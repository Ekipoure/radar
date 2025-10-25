'use client';

import { useState } from 'react';
import { CreateAdData } from '@/lib/types';

interface AddAdModalProps {
  onClose: () => void;
  onAdAdded: () => void;
}

export default function AddAdModal({ onClose, onAdAdded }: AddAdModalProps) {
  const [formData, setFormData] = useState<CreateAdData>({
    title: '',
    image_url: '',
    link_url: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      
      // Validate that at least one image source is provided
      if (!selectedFile && !formData.image_url) {
        setError('لطفاً یک تصویر آپلود کنید یا آدرس تصویر وارد کنید');
        setLoading(false);
        return;
      }
      
      // If a file is selected, upload it first
      let imageUrl = formData.image_url;
      if (selectedFile) {
        const formDataUpload = new FormData();
        formDataUpload.append('file', selectedFile);
        
        const uploadResponse = await fetch('/api/ads/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formDataUpload
        });
        
        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(errorData.error || 'خطا در آپلود فایل');
        }
        
        const uploadData = await uploadResponse.json();
        imageUrl = uploadData.url;
      }

      const response = await fetch('/api/ads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          image_url: imageUrl
        })
      });

      if (response.ok) {
        onAdAdded();
        onClose();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'خطا در ایجاد تبلیغ');
      }
    } catch (error) {
      console.error('Error creating ad:', error);
      setError(error instanceof Error ? error.message : 'خطا در ارتباط با سرور');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setImagePreview('');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" dir="rtl">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">افزودن تبلیغ جدید</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                عنوان تبلیغ
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="عنوان تبلیغ را وارد کنید"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                تصویر تبلیغ
              </label>
              <div className="space-y-3">
                {/* File Upload Option */}
                <div>
                  <label htmlFor="file_upload" className="block text-sm text-gray-600 mb-1">
                    آپلود فایل
                  </label>
                  <input
                    type="file"
                    id="file_upload"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {selectedFile && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-sm text-gray-600">{selectedFile.name}</span>
                      <button
                        type="button"
                        onClick={clearFile}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        حذف
                      </button>
                    </div>
                  )}
                </div>

                {/* Image URL Option */}
                <div>
                  <label htmlFor="image_url" className="block text-sm text-gray-600 mb-1">
                    یا آدرس تصویر
                  </label>
                  <input
                    type="url"
                    id="image_url"
                    name="image_url"
                    value={formData.image_url}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                {/* Image Preview */}
                {(imagePreview || formData.image_url) && (
                  <div className="mt-3">
                    <label className="block text-sm text-gray-600 mb-1">پیش‌نمایش تصویر</label>
                    <img
                      src={imagePreview || formData.image_url}
                      alt="Preview"
                      className="w-full h-32 object-cover rounded-lg border"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="link_url" className="block text-sm font-medium text-gray-700 mb-2">
                لینک مقصد (اختیاری)
              </label>
              <input
                type="url"
                id="link_url"
                name="link_url"
                value={formData.link_url}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://example.com"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
              >
                انصراف
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'در حال ایجاد...' : 'ایجاد تبلیغ'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
