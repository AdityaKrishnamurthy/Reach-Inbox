'use client';

import React, { useState } from 'react';
import { Calendar, Clock, X } from 'lucide-react';

interface SendLaterPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTime: (date: Date) => void;
  initialDate?: Date;
}

export const SendLaterPopover: React.FC<SendLaterPopoverProps> = ({
  isOpen,
  onClose,
  onSelectTime,
  initialDate,
}) => {
  const [selectedTime, setSelectedTime] = useState<Date>(initialDate || new Date());
  const [customDateTimeStr, setCustomDateTimeStr] = useState<string>(() => {
    const d = initialDate || new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });

  if (!isOpen) return null;

  // Preset options
  const getTomorrowAt = (hour: number, minute: number = 0) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(hour, minute, 0, 0);
    return tomorrow;
  };

  const getInHours = (hours: number) => {
    const d = new Date();
    d.setHours(d.getHours() + hours);
    return d;
  };

  const presets = [
    { label: 'Now (Immediate)', date: new Date() },
    { label: 'Tomorrow, 9:00 AM', date: getTomorrowAt(9, 0) },
    { label: 'Tomorrow, 10:00 AM', date: getTomorrowAt(10, 0) },
    { label: 'Tomorrow, 11:00 AM', date: getTomorrowAt(11, 0) },
    { label: 'Tomorrow, 3:00 PM', date: getTomorrowAt(15, 0) },
    { label: 'In 2 hours', date: getInHours(2) },
  ];

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomDateTimeStr(e.target.value);
    if (e.target.value) {
      const parsed = new Date(e.target.value);
      if (!isNaN(parsed.getTime())) {
        setSelectedTime(parsed);
      }
    }
  };

  const handlePresetSelect = (d: Date) => {
    setSelectedTime(d);
    const pad = (n: number) => n.toString().padStart(2, '0');
    setCustomDateTimeStr(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
  };

  const handleDone = () => {
    onSelectTime(selectedTime);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm sm:bg-transparent sm:backdrop-blur-none">
      <div className="relative w-full max-w-sm bg-white rounded-xl border border-gray-200 shadow-xl p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-semibold text-gray-900">Send Later</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Custom Date & Time Picker */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600">Custom Schedule Time</label>
          <div className="relative">
            <input
              type="datetime-local"
              min={new Date().toISOString().slice(0, 16)}
              value={customDateTimeStr}
              onChange={handleCustomChange}
              className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Preset Options List */}
        <div className="space-y-1">
          <div className="text-xs font-medium text-gray-500 mb-1">Preset Choices</div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {presets.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handlePresetSelect(preset.date)}
                className={`w-full text-left px-3 py-2 text-xs rounded-md transition-colors flex items-center justify-between ${
                  Math.abs(selectedTime.getTime() - preset.date.getTime()) < 60000
                    ? 'bg-emerald-50 text-emerald-700 font-medium border border-emerald-200'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>{preset.label}</span>
                <span className="text-[10px] text-gray-400">
                  {preset.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDone}
            className="px-4 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-sm transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
