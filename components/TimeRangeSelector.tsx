'use client';

import { useState } from 'react';

interface TimeRangeSelectorProps {
  onTimeRangeSelect: (timeRange: string) => void;
  onBack: () => void;
  onConfirm: () => void;
  selectedDate: string; // Persian date string like "1404/08/04"
}

const timeRanges = [
  { id: '00-06', label: '۰۰:۰۰ – ۰۶:۰۰', start: '00:00', end: '06:00' },
  { id: '06-12', label: '۰۶:۰۰ – ۱۲:۰۰', start: '06:00', end: '12:00' },
  { id: '12-18', label: '۱۲:۰۰ – ۱۸:۰۰', start: '12:00', end: '18:00' },
  { id: '18-24', label: '۱۸:۰۰ – ۲۴:۰۰', start: '18:00', end: '24:00' }
];

export default function TimeRangeSelector({ onTimeRangeSelect, onBack, onConfirm, selectedDate }: TimeRangeSelectorProps) {
  const [selectedRange, setSelectedRange] = useState<string | null>(null);

  // Check if a time range is in the future
  const isTimeRangeInFuture = (rangeId: string): boolean => {
    const now = new Date();
    const currentHour = now.getHours();
    
    // If selected date is today, check if time range is in the future
    const today = new Date();
    const todayPersian = `${today.getFullYear() - 621}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getDate().toString().padStart(2, '0')}`;
    
    if (selectedDate === todayPersian) {
      const rangeStartHour = parseInt(timeRanges.find(r => r.id === rangeId)?.start.split(':')[0] || '0');
      return rangeStartHour > currentHour;
    }
    
    return false;
  };

  const handleRangeSelect = (rangeId: string) => {
    if (isTimeRangeInFuture(rangeId)) {
      alert('نمی‌توانید بازه زمانی آینده را انتخاب کنید!');
      return;
    }
    
    setSelectedRange(rangeId);
    const range = timeRanges.find(r => r.id === rangeId);
    if (range) {
      onTimeRangeSelect(range.label);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md mx-auto" dir="rtl">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="text-lg font-bold text-gray-800 mb-2">
          انتخاب بازه زمانی
        </div>
        <div className="text-sm text-gray-600">
          یکی از بازه‌های زمانی زیر را انتخاب کنید
        </div>
      </div>

      {/* Time range options */}
      <div className="space-y-3 mb-6">
        {timeRanges.map((range) => {
          const isFuture = isTimeRangeInFuture(range.id);
          return (
            <button
              key={range.id}
              onClick={() => handleRangeSelect(range.id)}
              disabled={isFuture}
              className={`
                w-full p-4 rounded-lg border-2 transition-all duration-200 text-right
                ${selectedRange === range.id
                  ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold'
                  : isFuture
                    ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700'
                }
              `}
            >
              <div className="text-lg">{range.label}</div>
              <div className="text-sm text-gray-500 mt-1">
                {range.start} تا {range.end}
                {isFuture && <span className="text-red-500 mr-2">(آینده)</span>}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected range display */}
      {selectedRange && (
        <div className="text-center mb-4">
          <div className="text-sm text-gray-600">بازه انتخاب شده:</div>
          <div className="text-lg font-semibold text-blue-600">
            {timeRanges.find(r => r.id === selectedRange)?.label}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3 rounded-lg font-medium bg-gray-200 hover:bg-gray-300 text-gray-700 transition-all duration-200"
        >
          برگشت
        </button>
        <button
          onClick={onConfirm}
          disabled={!selectedRange}
          className={`
            flex-1 py-3 rounded-lg font-medium transition-all duration-200
            ${selectedRange 
              ? 'bg-blue-500 hover:bg-blue-600 text-white' 
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          تأیید
        </button>
      </div>
    </div>
  );
}
