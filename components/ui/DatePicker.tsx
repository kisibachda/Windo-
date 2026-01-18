import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  className?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({ value, onChange, onKeyDown, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize view date from value or today
  const [viewDate, setViewDate] = useState(() => {
    const d = value ? new Date(value) : new Date();
    return isNaN(d.getTime()) ? new Date() : d;
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        // Only update view date if it's drastically different? 
        // Actually, usually user expects picker to open on selected date.
        // But we don't want to jump around if user is browsing.
        // Let's only sync when reopening or if value changes externally.
      }
    }
  }, [value]);

  const toggleOpen = () => {
      if (!isOpen) {
          const d = value ? new Date(value) : new Date();
          setViewDate(isNaN(d.getTime()) ? new Date() : d);
      }
      setIsOpen(!isOpen);
  };

  const changeMonth = (delta: number) => {
    const newDate = new Date(viewDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setViewDate(newDate);
  };

  const handleDateClick = (day: number) => {
    const newDate = new Date(viewDate);
    newDate.setDate(day);
    // Format YYYY-MM-DD
    const dateString = newDate.getFullYear() + '-' + String(newDate.getMonth() + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
    onChange(dateString);
    setIsOpen(false);
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(viewDate);
    const firstDay = getFirstDayOfMonth(viewDate);
    const days = [];

    // Empty slots for days before start of month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-8"></div>);
    }

    // Days
    for (let i = 1; i <= daysInMonth; i++) {
        // Check if selected
        const currentCheck = new Date(viewDate);
        currentCheck.setDate(i);
        const currentString = currentCheck.getFullYear() + '-' + String(currentCheck.getMonth() + 1).padStart(2, '0') + '-' + String(i).padStart(2, '0');
        const isSelected = value === currentString;
        const isToday = new Date().toDateString() === currentCheck.toDateString();

        days.push(
            <button
                key={i}
                type="button"
                onClick={() => handleDateClick(i)}
                className={`h-8 w-8 rounded-full flex items-center justify-center text-sm transition-colors ${
                    isSelected 
                    ? 'bg-blue-600 text-white font-bold shadow-md' 
                    : isToday 
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
            >
                {i}
            </button>
        );
    }

    return days;
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Trigger Input */}
      <div 
        className="relative cursor-pointer" 
        onClick={toggleOpen}
      >
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <CalendarIcon size={16} className="text-slate-400" />
        </div>
        <input
            type="text"
            readOnly
            value={value}
            onKeyDown={onKeyDown}
            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:focus:ring-blue-500/30 transition-all text-slate-600 dark:text-slate-300 font-medium cursor-pointer caret-transparent"
        />
      </div>

      {/* Popover */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-4 w-64 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <button 
                    type="button"
                    onClick={() => changeMonth(-1)}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400"
                >
                    <ChevronLeft size={20} />
                </button>
                <span className="font-semibold text-slate-800 dark:text-slate-100">
                    {monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}
                </span>
                <button 
                    type="button"
                    onClick={() => changeMonth(1)}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400"
                >
                    <ChevronRight size={20} />
                </button>
            </div>

            {/* Days Header */}
            <div className="grid grid-cols-7 mb-2 text-center">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                    <span key={day} className="text-xs font-medium text-slate-400 uppercase">
                        {day}
                    </span>
                ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1 place-items-center">
                {renderCalendar()}
            </div>
        </div>
      )}
    </div>
  );
};