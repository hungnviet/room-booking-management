'use client';

import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, addMonths, startOfWeek, endOfWeek, addWeeks } from 'date-fns';
import { FiCalendar, FiList, FiFilter, FiChevronLeft, FiChevronRight, FiClock, FiMapPin, FiFileText } from 'react-icons/fi';

interface Schedule {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  note?: string;
  room: {
    id: string;
    room_id: string;
    name: string;
    location?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export default function StaffSchedulePage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate)
  });

  // Format time to be more readable
  const formatTime = (timeString: string) => {
    try {
      const date = new Date(timeString);
      return format(date, 'h:mm a');
    } catch (error) {
      return timeString;
    }
  };

  // Format date to be more readable
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'EEEE, MMM d, yyyy');
    } catch (error) {
      return dateString;
    }
  };

  // Fetch schedules based on current date range
  const fetchSchedules = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const queryParams = new URLSearchParams({
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
        includeRoomDetails: 'true'
      });
      
      const response = await fetch(`/api/schedule?${queryParams.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${await response.text()}`);
      }
      
      const data = await response.json();
      setSchedules(data.schedules);
    } catch (err) {
      console.error('Error fetching schedules:', err);
      setError(err instanceof Error ? err.message : 'Failed to load schedules');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchSchedules();
  }, [dateRange]);

  // Navigate to previous month/week
  const goToPrevious = () => {
    if (viewMode === 'calendar') {
      // Month view: go back one month
      const newDate = addMonths(currentDate, -1);
      setCurrentDate(newDate);
      setDateRange({
        start: startOfMonth(newDate),
        end: endOfMonth(newDate)
      });
    } else {
      // List view: go back one week
      const newDate = addWeeks(currentDate, -1);
      setCurrentDate(newDate);
      setDateRange({
        start: startOfWeek(newDate, { weekStartsOn: 1 }),
        end: endOfWeek(newDate, { weekStartsOn: 1 })
      });
    }
  };

  // Navigate to next month/week
  const goToNext = () => {
    if (viewMode === 'calendar') {
      // Month view: go forward one month
      const newDate = addMonths(currentDate, 1);
      setCurrentDate(newDate);
      setDateRange({
        start: startOfMonth(newDate),
        end: endOfMonth(newDate)
      });
    } else {
      // List view: go forward one week
      const newDate = addWeeks(currentDate, 1);
      setCurrentDate(newDate);
      setDateRange({
        start: startOfWeek(newDate, { weekStartsOn: 1 }),
        end: endOfWeek(newDate, { weekStartsOn: 1 })
      });
    }
  };

  // Switch between calendar and list views
  const toggleViewMode = (mode: 'calendar' | 'list') => {
    setViewMode(mode);
    
    // Update date range based on view mode
    if (mode === 'calendar') {
      setDateRange({
        start: startOfMonth(currentDate),
        end: endOfMonth(currentDate)
      });
    } else {
      setDateRange({
        start: startOfWeek(currentDate, { weekStartsOn: 1 }),
        end: endOfWeek(currentDate, { weekStartsOn: 1 })
      });
    }
  };

  // Group schedules by date for calendar view
  const schedulesByDate = schedules.reduce((acc: Record<string, Schedule[]>, schedule) => {
    const dateKey = format(new Date(schedule.date), 'yyyy-MM-dd');
    
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    
    acc[dateKey].push(schedule);
    return acc;
  }, {});

  // Generate calendar days for the current month
  const generateCalendarDays = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    
    const days = [];
    let day = startDate;
    
    while (day <= endDate) {
      const dateKey = format(day, 'yyyy-MM-dd');
      const isCurrentMonth = day.getMonth() === currentDate.getMonth();
      
      days.push({
        date: new Date(day),
        isCurrentMonth,
        schedules: schedulesByDate[dateKey] || []
      });
      
      day = new Date(day.getTime() + 24 * 60 * 60 * 1000); // add one day
    }
    
    return days;
  };

  // Render loading state
  if (loading && schedules.length === 0) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">My Schedule</h1>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Schedule</h1>
        
        <div className="flex items-center space-x-2">
          <div className="inline-flex rounded-md shadow-sm">
            <button 
              onClick={() => toggleViewMode('calendar')} 
              className={`px-4 py-2 text-sm font-medium rounded-l-md ${
                viewMode === 'calendar' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FiCalendar className="inline mr-1" /> Calendar
            </button>
            <button 
              onClick={() => toggleViewMode('list')} 
              className={`px-4 py-2 text-sm font-medium rounded-r-md ${
                viewMode === 'list' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FiList className="inline mr-1" /> List
            </button>
          </div>
        </div>
      </div>
      
      {/* Date navigation */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={goToPrevious}
          className="flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          <FiChevronLeft className="mr-1" /> 
          {viewMode === 'calendar' ? 'Previous Month' : 'Previous Week'}
        </button>
        
        <h2 className="text-xl font-medium">
          {viewMode === 'calendar' 
            ? format(currentDate, 'MMMM yyyy')
            : `${format(dateRange.start, 'MMM d')} - ${format(dateRange.end, 'MMM d, yyyy')}`
          }
        </h2>
        
        <button
          onClick={goToNext}
          className="flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          {viewMode === 'calendar' ? 'Next Month' : 'Next Week'} 
          <FiChevronRight className="ml-1" />
        </button>
      </div>
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
          <p className="font-medium">Error</p>
          <p>{error}</p>
        </div>
      )}
      
      {viewMode === 'calendar' ? (
        // Calendar View
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="grid grid-cols-7 border-b">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div key={day} className="py-2 text-center text-sm font-medium text-gray-500">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 auto-rows-fr">
            {generateCalendarDays().map((day, idx) => (
              <div 
                key={idx} 
                className={`min-h-[120px] border p-1 ${
                  day.isCurrentMonth ? 'bg-white' : 'bg-gray-50 text-gray-400'
                }`}
              >
                <div className="text-right mb-1 text-sm">
                  {format(day.date, 'd')}
                </div>
                
                <div className="space-y-1 overflow-y-auto max-h-[100px]">
                  {day.schedules.map(schedule => (
                    <div 
                      key={schedule.id} 
                      className="text-xs p-1 rounded bg-blue-100 text-blue-800 truncate"
                      title={`${formatTime(schedule.start_time)} - ${formatTime(schedule.end_time)}: ${schedule.room.name}`}
                    >
                      {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}<br />
                      {schedule.room.name}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        // List View
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {schedules.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No schedules found for this time period.
            </div>
          ) : (
            <div className="divide-y">
              {schedules.map(schedule => (
                <div key={schedule.id} className="p-4 hover:bg-gray-50">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-2">
                    <h3 className="font-semibold text-lg">{schedule.room.name}</h3>
                    <span className="text-sm text-gray-500">{formatDate(schedule.date)}</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <FiClock className="text-gray-400 mr-2" />
                        <span>{formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}</span>
                      </div>
                      
                      <div className="flex items-center">
                        <FiMapPin className="text-gray-400 mr-2" />
                        <span>
                          {schedule.room.room_id}
                          {schedule.room.location && ` - ${schedule.room.location}`}
                        </span>
                      </div>
                    </div>
                    
                    {schedule.note && (
                      <div className="flex items-start">
                        <FiFileText className="text-gray-400 mr-2 mt-1" />
                        <span className="text-sm">{schedule.note}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}