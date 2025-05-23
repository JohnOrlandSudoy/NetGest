import React, { useState, useEffect, useRef } from 'react';
import { format, isAfter, isBefore, isEqual, addDays, subDays } from 'date-fns';
import { FaCalendarAlt, FaChevronLeft, FaChevronRight, FaTimes } from 'react-icons/fa';

const DateRangePicker = ({ 
  startDate, 
  endDate, 
  onChange, 
  maxDate = new Date(), 
  minDate = subDays(new Date(), 90),
  onClose
}) => {
  const [localStartDate, setLocalStartDate] = useState(startDate || subDays(new Date(), 14));
  const [localEndDate, setLocalEndDate] = useState(endDate || new Date());
  const [selecting, setSelecting] = useState('start'); // 'start' or 'end'
  const [currentMonth, setCurrentMonth] = useState(new Date(localStartDate));
  const pickerRef = useRef(null);

  // Update local dates when props change
  useEffect(() => {
    if (startDate) setLocalStartDate(startDate);
    if (endDate) setLocalEndDate(endDate);
  }, [startDate, endDate]);

  // Handle outside clicks to close the picker
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        onClose && onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Generate days for the current month view
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    // Get the day of the week for the first day (0 = Sunday, 1 = Monday, etc.)
    const firstDayOfWeek = firstDay.getDay();
    
    // Create array of day objects
    const days = [];
    
    // Add empty days for the start of the month
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push({ date: null, isCurrentMonth: false });
    }
    
    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      days.push({
        date,
        isCurrentMonth: true,
        isToday: isEqual(date, new Date(new Date().setHours(0, 0, 0, 0))),
        isSelected: isEqual(date, localStartDate) || isEqual(date, localEndDate),
        isInRange: isAfter(date, localStartDate) && isBefore(date, localEndDate),
        isStart: isEqual(date, localStartDate),
        isEnd: isEqual(date, localEndDate),
        isDisabled: isBefore(date, minDate) || isAfter(date, maxDate)
      });
    }
    
    return days;
  };

  // Navigate to previous month
  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  // Navigate to next month
  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  // Handle date selection
  const handleDateClick = (date) => {
    if (!date || date.isDisabled) return;
    
    if (selecting === 'start') {
      // If selecting start date, set it and switch to selecting end date
      setLocalStartDate(date.date);
      setSelecting('end');
      
      // If the new start date is after the current end date, reset end date
      if (isAfter(date.date, localEndDate)) {
        setLocalEndDate(addDays(date.date, 1));
      }
    } else {
      // If selecting end date, set it and apply the change
      if (isBefore(date.date, localStartDate)) {
        // If clicked date is before start date, swap them
        setLocalEndDate(localStartDate);
        setLocalStartDate(date.date);
      } else {
        setLocalEndDate(date.date);
      }
      
      // Apply the change
      onChange && onChange({
        startDate: isBefore(date.date, localStartDate) ? date.date : localStartDate,
        endDate: isBefore(date.date, localStartDate) ? localStartDate : date.date
      });
      
      // Reset to selecting start date
      setSelecting('start');
    }
  };

  // Apply preset range
  const applyPreset = (days) => {
    const end = new Date();
    const start = subDays(end, days);
    
    setLocalStartDate(start);
    setLocalEndDate(end);
    
    onChange && onChange({
      startDate: start,
      endDate: end
    });
  };

  // Render the calendar
  const days = getDaysInMonth(currentMonth);
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div 
      ref={pickerRef}
      className="bg-white rounded-lg shadow-lg p-4 w-80 border border-gray-200"
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          Select Date Range
        </h3>
        <button 
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          <FaTimes />
        </button>
      </div>
      
      {/* Preset buttons */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <button 
          onClick={() => applyPreset(7)}
          className="px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
        >
          Last 7 days
        </button>
        <button 
          onClick={() => applyPreset(14)}
          className="px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
        >
          Last 14 days
        </button>
        <button 
          onClick={() => applyPreset(30)}
          className="px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
        >
          Last 30 days
        </button>
      </div>
      
      {/* Selected range display */}
      <div className="flex justify-between items-center mb-4 text-sm">
        <div className="bg-gray-100 px-2 py-1 rounded">
          {format(localStartDate, 'MMM dd, yyyy')}
        </div>
        <div className="text-gray-500">to</div>
        <div className="bg-gray-100 px-2 py-1 rounded">
          {format(localEndDate, 'MMM dd, yyyy')}
        </div>
      </div>
      
      {/* Month navigation */}
      <div className="flex justify-between items-center mb-2">
        <button 
          onClick={prevMonth}
          className="p-1 rounded-full hover:bg-gray-100"
        >
          <FaChevronLeft className="text-gray-600" />
        </button>
        <h4 className="font-medium">
          {format(currentMonth, 'MMMM yyyy')}
        </h4>
        <button 
          onClick={nextMonth}
          className="p-1 rounded-full hover:bg-gray-100"
        >
          <FaChevronRight className="text-gray-600" />
        </button>
      </div>
      
      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {weekdays.map(day => (
          <div key={day} className="text-center text-xs font-medium text-gray-500">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar days */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => (
          <button
            key={index}
            onClick={() => handleDateClick(day)}
            disabled={!day.date || day.isDisabled}
            className={`
              h-8 w-8 flex items-center justify-center text-sm rounded-full
              ${!day.date ? 'invisible' : ''}
              ${day.isDisabled ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-gray-100'}
              ${day.isToday ? 'border border-blue-500' : ''}
              ${day.isStart ? 'bg-blue-500 text-white hover:bg-blue-600' : ''}
              ${day.isEnd ? 'bg-blue-500 text-white hover:bg-blue-600' : ''}
              ${day.isInRange ? 'bg-blue-100' : ''}
            `}
          >
            {day.date ? day.date.getDate() : ''}
          </button>
        ))}
      </div>
      
      {/* Apply button */}
      <div className="mt-4 flex justify-end">
        <button
          onClick={() => {
            onChange && onChange({ startDate: localStartDate, endDate: localEndDate });
            onClose && onClose();
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Apply
        </button>
      </div>
    </div>
  );
};

export default DateRangePicker;