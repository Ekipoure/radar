'use client';

import { useState, useEffect } from 'react';
import { formatHeaderTime, getIranTime, gregorianToPersian, persianToGregorian, PersianDate } from '@/lib/timezone';

interface PersianDatePickerProps {
  onDateSelect: (date: string) => void;
  onNext: () => void;
}

export default function PersianDatePicker({ onDateSelect, onNext }: PersianDatePickerProps) {
  // Persian month names
  const persianMonths = [
    'فروردین', 'اردیبهشت', 'خرداد', 'تیر',
    'مرداد', 'شهریور', 'مهر', 'آبان',
    'دی', 'بهمن', 'اسفند'
  ];

  const persianWeekDays = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

  const [currentDate, setCurrentDate] = useState<Date>(() => {
    // Get current date in Tehran timezone
    const now = new Date();
    const tehranDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tehran' }));
    return tehranDate;
  });
  const [selectedDate, setSelectedDate] = useState<PersianDate | null>(null);
  const [currentPersianDate, setCurrentPersianDate] = useState<PersianDate>(() => {
    const now = new Date();
    const tehranDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tehran' }));
    return gregorianToPersian(tehranDate);
  });
  const [displayMonth, setDisplayMonth] = useState<PersianDate>(() => {
    const now = new Date();
    const tehranDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tehran' }));
    return gregorianToPersian(tehranDate);
  });

  // Get days in Persian month
  const getDaysInPersianMonth = (year: number, month: number): number => {
    // First 6 months have 31 days
    if (month <= 6) return 31;
    // Months 7-11 have 30 days
    if (month <= 11) return 30;
    // Month 12 (Esfand) has 29 or 30 days depending on leap year
    // Simple leap year check
    return ((year + 2346) % 128) < 29 ? 30 : 29;
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const daysInMonth = getDaysInPersianMonth(displayMonth.year, displayMonth.month);
    const days = [];
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate: PersianDate = {
        year: displayMonth.year,
        month: displayMonth.month,
        day: day
      };
      
      const isToday = currentPersianDate.year === displayMonth.year && 
        currentPersianDate.month === displayMonth.month && 
        currentPersianDate.day === day;
      
      const isFuture = dayDate.year > currentPersianDate.year ||
        (dayDate.year === currentPersianDate.year && dayDate.month > currentPersianDate.month) ||
        (dayDate.year === currentPersianDate.year && dayDate.month === currentPersianDate.month && dayDate.day > currentPersianDate.day);
      
      days.push({
        day,
        isSelected: selectedDate && 
          selectedDate.year === displayMonth.year && 
          selectedDate.month === displayMonth.month && 
          selectedDate.day === day,
        isToday,
        isFuture
      });
    }
    
    return days;
  };

  // Initialize current Persian date
  useEffect(() => {
    const now = new Date();
    const tehranDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tehran' }));
    const persianDate = gregorianToPersian(tehranDate);
    setCurrentPersianDate(persianDate);
    setDisplayMonth(persianDate);
    setCurrentDate(tehranDate);
  }, []);

  // Update current Persian date every minute
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const tehranDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tehran' }));
      setCurrentDate(tehranDate);
      const persianDate = gregorianToPersian(tehranDate);
      setCurrentPersianDate(persianDate);
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Handle date selection
  const handleDateSelect = (day: number) => {
    const newDate: PersianDate = {
      year: displayMonth.year,
      month: displayMonth.month,
      day: day
    };
    
    // Check if the selected date is in the future
    const isFuture = newDate.year > currentPersianDate.year ||
      (newDate.year === currentPersianDate.year && newDate.month > currentPersianDate.month) ||
      (newDate.year === currentPersianDate.year && newDate.month === currentPersianDate.month && newDate.day > currentPersianDate.day);
    
    if (isFuture) {
      alert('نمی‌توانید تاریخ آینده را انتخاب کنید!');
      return;
    }
    
    setSelectedDate(newDate);
    onDateSelect(`${newDate.year}/${newDate.month.toString().padStart(2, '0')}/${newDate.day.toString().padStart(2, '0')}`);
  };

  // Navigate months
  const navigateMonth = (direction: 'prev' | 'next') => {
    setDisplayMonth(prev => {
      let newMonth = prev.month + (direction === 'next' ? 1 : -1);
      let newYear = prev.year;
      
      if (newMonth > 12) {
        newMonth = 1;
        newYear += 1;
      } else if (newMonth < 1) {
        newMonth = 12;
        newYear -= 1;
      }
      
      return { ...prev, month: newMonth, year: newYear };
    });
  };

  const calendarDays = generateCalendarDays();

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md mx-auto" dir="rtl">
      {/* Header with current time */}
      <div className="text-center mb-6">
        <div className="text-lg font-bold text-gray-800 mb-2">
          انتخاب تاریخ
        </div>
        <div className="text-sm text-gray-600" suppressHydrationWarning>
          {formatHeaderTime(currentDate)}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          امروز: {currentPersianDate.day} {persianMonths[currentPersianDate.month - 1]} {currentPersianDate.year}
        </div>
      </div>

      {/* Month navigation */}
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() => navigateMonth('prev')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <div className="text-lg font-semibold text-gray-800">
          {persianMonths[displayMonth.month - 1]} {displayMonth.year}
        </div>
        
        <button
          onClick={() => navigateMonth('next')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Week days header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {persianWeekDays.map((day, index) => (
          <div key={index} className="text-center text-sm font-medium text-gray-500 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar days */}
      <div className="grid grid-cols-7 gap-1 mb-6">
        {calendarDays.map(({ day, isSelected, isToday, isFuture }) => (
          <button
            key={day}
            onClick={() => handleDateSelect(day)}
            disabled={isFuture}
            className={`
              p-2 text-sm rounded-lg transition-all duration-200
              ${isSelected 
                ? 'bg-blue-500 text-white font-bold' 
                : isToday 
                  ? 'bg-blue-100 text-blue-700 font-semibold' 
                  : isFuture
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'hover:bg-gray-100 text-gray-700'
              }
            `}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Selected date display */}
      {selectedDate && (
        <div className="text-center mb-4">
          <div className="text-sm text-gray-600">تاریخ انتخاب شده:</div>
          <div className="text-lg font-semibold text-blue-600">
            {selectedDate.day} {persianMonths[selectedDate.month - 1]} {selectedDate.year}
          </div>
        </div>
      )}

      {/* Continue button */}
      <button
        onClick={onNext}
        disabled={!selectedDate}
        className={`
          w-full py-3 rounded-lg font-medium transition-all duration-200
          ${selectedDate 
            ? 'bg-blue-500 hover:bg-blue-600 text-white' 
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }
        `}
      >
        ادامه
      </button>
    </div>
  );
}
