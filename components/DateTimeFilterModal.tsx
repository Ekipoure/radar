'use client';

import { useState } from 'react';
import PersianDatePicker from './PersianDatePicker';
import TimeRangeSelector from './TimeRangeSelector';

interface DateTimeFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilter: (filter: { date: string; timeRange: string }) => void;
}

type Step = 'date' | 'time';

export default function DateTimeFilterModal({ isOpen, onClose, onApplyFilter }: DateTimeFilterModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>('date');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('');

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
  };

  const handleNext = () => {
    setCurrentStep('time');
  };

  const handleTimeRangeSelect = (timeRange: string) => {
    setSelectedTimeRange(timeRange);
  };

  const handleBack = () => {
    setCurrentStep('date');
  };

  const handleConfirm = () => {
    if (selectedDate && selectedTimeRange) {
      onApplyFilter({
        date: selectedDate,
        timeRange: selectedTimeRange
      });
      onClose();
      // Reset state
      setCurrentStep('date');
      setSelectedDate('');
      setSelectedTimeRange('');
    }
  };

  const handleClose = () => {
    onClose();
    // Reset state
    setCurrentStep('date');
    setSelectedDate('');
    setSelectedTimeRange('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">
            فیلتر بازه زمانی
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          {/* Progress indicator */}
          <div className="flex justify-center mb-6">
            <div className="flex items-center space-x-4 space-x-reverse">
              <div className={`flex items-center ${currentStep === 'date' ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  currentStep === 'date' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  ۱
                </div>
                <span className="mr-2 text-sm">انتخاب تاریخ</span>
              </div>
              <div className={`w-8 h-0.5 ${currentStep === 'time' ? 'bg-blue-500' : 'bg-gray-200'}`}></div>
              <div className={`flex items-center ${currentStep === 'time' ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  currentStep === 'time' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  ۲
                </div>
                <span className="mr-2 text-sm">انتخاب بازه زمانی</span>
              </div>
            </div>
          </div>

          {/* Step content */}
          {currentStep === 'date' && (
            <PersianDatePicker
              onDateSelect={handleDateSelect}
              onNext={handleNext}
            />
          )}

          {currentStep === 'time' && (
            <TimeRangeSelector
              onTimeRangeSelect={handleTimeRangeSelect}
              onBack={handleBack}
              onConfirm={handleConfirm}
              selectedDate={selectedDate}
            />
          )}
        </div>
      </div>
    </div>
  );
}
