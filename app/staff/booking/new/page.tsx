'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format, addMinutes, set, parse } from 'date-fns';
import { 
  FiSearch, FiChevronDown, FiCalendar, FiClock, 
  FiCheck, FiAlertCircle, FiArrowLeft, FiInfo
} from 'react-icons/fi';

// Define types
interface Room {
  id: string;
  room_id: string;
  name: string;
  location: string;
  capacity: number;
  features: string[];
  description?: string;
}

export default function CreateBookingPage() {
  // State for form data
  const [formData, setFormData] = useState({
    room_id: '',
    booking_date: format(new Date(), 'yyyy-MM-dd'),
    start_time: '',
    end_time: '',
    note: ''
  });
  
  // State for available rooms
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [roomSearchQuery, setRoomSearchQuery] = useState('');
  const [roomDropdownOpen, setRoomDropdownOpen] = useState(false);
  
  // State for form validation
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  
  // State for API interactions
  const [loading, setLoading] = useState(false);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  const router = useRouter();

  // Generate time slots (30 minute intervals)
  useEffect(() => {
    const slots = [];
    const start = set(new Date(), { hours: 8, minutes: 0, seconds: 0 });
    const end = set(new Date(), { hours: 20, minutes: 0, seconds: 0 });
    
    let current = start;
    while (current <= end) {
      slots.push(format(current, 'HH:mm'));
      current = addMinutes(current, 30);
    }
    
    setTimeSlots(slots);
  }, []);

  // Fetch available rooms
  const fetchAvailableRooms = async () => {
    if (!formData.booking_date || !formData.start_time || !formData.end_time) {
      return;
    }
    
    try {
      setRoomsLoading(true);
      
      // Format date and times for the API
      const bookingDate = formData.booking_date;
      
      // Build query parameters using availableOn and time slots for more precise filtering
      const queryParams = new URLSearchParams({
        availableOn: bookingDate,
        availableFromTimeSlot: formData.start_time,
        availableToTimeSlot: formData.end_time,
        includeSchedules: 'false',
        isActive: 'true'
      });
      
      if (roomSearchQuery) {
        queryParams.append('search', roomSearchQuery);
      }
      
      const response = await fetch(`/api/management/rooms?${queryParams.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${await response.text()}`);
      }
      
      const data = await response.json();
      setAvailableRooms(data.rooms.map((room: any) => ({
        id: room.id,
        room_id: room.room_id,
        name: room.name,
        location: room.location,
        capacity: room.capacity,
        features: room.features,
        description: room.description
      })));
    } catch (err) {
      console.error('Error fetching available rooms:', err);
      setErrors(prev => ({ ...prev, room_id: 'Failed to load available rooms' }));
    } finally {
      setRoomsLoading(false);
    }
  };

  // Fetch rooms when date and time are set
  useEffect(() => {
    if (formData.booking_date && formData.start_time && formData.end_time) {
      fetchAvailableRooms();
    }
  }, [formData.booking_date, formData.start_time, formData.end_time, roomSearchQuery]);

  // Handle form field changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when field is changed
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Select a room from dropdown
  const handleRoomSelect = (room: Room) => {
    setSelectedRoom(room);
    setFormData(prev => ({ ...prev, room_id: room.id }));
    setRoomDropdownOpen(false);
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.room_id;
      return newErrors;
    });
  };

  // Validate form data
  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!formData.room_id) {
      newErrors.room_id = 'Please select a room';
    }
    
    if (!formData.booking_date) {
      newErrors.booking_date = 'Please select a date';
    }
    
    if (!formData.start_time) {
      newErrors.start_time = 'Please select a start time';
    }
    
    if (!formData.end_time) {
      newErrors.end_time = 'Please select an end time';
    }
    
    if (formData.start_time && formData.end_time) {
      const start = parse(formData.start_time, 'HH:mm', new Date());
      const end = parse(formData.end_time, 'HH:mm', new Date());
      
      if (start >= end) {
        newErrors.end_time = 'End time must be after start time';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setSubmitError(null);
    
    try {
      // Format date and times for API
      const bookingDate = formData.booking_date;
      const startDateTime = `${bookingDate}T${formData.start_time}:00`;
      const endDateTime = `${bookingDate}T${formData.end_time}:00`;
      
      const response = await fetch('/api/booking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          room_id: formData.room_id,
          booking_date: bookingDate,
          start_time: startDateTime,
          end_time: endDateTime,
          note: formData.note.trim()
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 409) {
          setSubmitError('The selected room is no longer available for the requested time. Please select another room or time.');
        } else {
          setSubmitError(data.message || 'Failed to create booking request');
        }
        return;
      }
      
      // Redirect to bookings page on success
      router.push('/staff/booking');
      router.refresh();
    } catch (err) {
      console.error('Error creating booking:', err);
      setSubmitError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center text-blue-600 hover:text-blue-800"
        >
          <FiArrowLeft className="mr-1" /> Back to Bookings
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="px-6 py-4 bg-blue-600 text-white">
          <h1 className="text-xl font-bold">Create New Booking Request</h1>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          {/* Date and Time Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label htmlFor="booking_date" className="block text-sm font-medium text-gray-700 mb-1">
                Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  id="booking_date"
                  name="booking_date"
                  min={format(new Date(), 'yyyy-MM-dd')}
                  value={formData.booking_date}
                  onChange={handleChange}
                  className={`pl-10 w-full rounded-md ${
                    errors.booking_date
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  } shadow-sm`}
                  required
                />
                <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
              {errors.booking_date && (
                <p className="mt-1 text-sm text-red-600">{errors.booking_date}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="start_time" className="block text-sm font-medium text-gray-700 mb-1">
                Start Time <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  id="start_time"
                  name="start_time"
                  value={formData.start_time}
                  onChange={handleChange}
                  className={`pl-10 w-full rounded-md ${
                    errors.start_time
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  } shadow-sm`}
                  required
                >
                  <option value="">Select start time</option>
                  {timeSlots.map((time) => (
                    <option key={`start-${time}`} value={time}>
                      {format(parse(time, 'HH:mm', new Date()), 'h:mm a')}
                    </option>
                  ))}
                </select>
                <FiClock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
              {errors.start_time && (
                <p className="mt-1 text-sm text-red-600">{errors.start_time}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="end_time" className="block text-sm font-medium text-gray-700 mb-1">
                End Time <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  id="end_time"
                  name="end_time"
                  value={formData.end_time}
                  onChange={handleChange}
                  className={`pl-10 w-full rounded-md ${
                    errors.end_time
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  } shadow-sm`}
                  required
                >
                  <option value="">Select end time</option>
                    {timeSlots.map((time) => (
                    <option 
                        key={`end-${time}`} 
                        value={time}
                        disabled={formData.start_time ? time <= formData.start_time : false}
                    >
                        {format(parse(time, 'HH:mm', new Date()), 'h:mm a')}
                    </option>
                    ))}
                </select>
                <FiClock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
              {errors.end_time && (
                <p className="mt-1 text-sm text-red-600">{errors.end_time}</p>
              )}
            </div>
          </div>
          
          {/* Room Selection */}
          <div className="mb-6">
            <label htmlFor="room" className="block text-sm font-medium text-gray-700 mb-1">
              Room <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div 
                className={`relative w-full flex items-center px-3 py-2 border ${
                  errors.room_id
                    ? 'border-red-300 focus-within:border-red-500 focus-within:ring-red-500'
                    : 'border-gray-300 focus-within:border-blue-500 focus-within:ring-blue-500'
                } rounded-md shadow-sm`}
              >
                <FiSearch className="text-gray-400 mr-2" />
                <input
                  type="text"
                  placeholder="Search for a room..."
                  value={roomSearchQuery}
                  onChange={(e) => setRoomSearchQuery(e.target.value)}
                  onFocus={() => setRoomDropdownOpen(true)}
                  className="flex-1 p-0 border-0 focus:ring-0 focus:outline-none text-sm"
                  disabled={!formData.booking_date || !formData.start_time || !formData.end_time}
                />
                <button 
                  type="button"
                  onClick={() => setRoomDropdownOpen(!roomDropdownOpen)}
                  className="text-gray-400"
                >
                  <FiChevronDown />
                </button>
                
                {/* Display selected room */}
                {selectedRoom && (
                  <div className="absolute top-0 left-0 right-0 bottom-0 flex items-center px-3 pointer-events-none bg-white">
                    <FiCheck className="text-green-500 mr-2" />
                    <span>{selectedRoom.name} ({selectedRoom.room_id}) - {selectedRoom.location}</span>
                  </div>
                )}
              </div>
              
              {/* Room dropdown */}
              {roomDropdownOpen && (
                <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-300 max-h-60 overflow-auto">
                  {roomsLoading ? (
                    <div className="p-4 text-center text-gray-500">
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500 mx-auto mb-2"></div>
                      Loading available rooms...
                    </div>
                  ) : availableRooms.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      {formData.booking_date && formData.start_time && formData.end_time ? (
                        <>
                          <FiInfo className="mx-auto h-5 w-5 text-gray-400 mb-1" />
                          No rooms available for the selected time
                        </>
                      ) : (
                        "Please select date and time first"
                      )}
                    </div>
                  ) : (
                    availableRooms.map((room) => (
                      <div
                        key={room.id}
                        onClick={() => handleRoomSelect(room)}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                      >
                        <div className="font-medium">{room.name}</div>
                        <div className="text-sm text-gray-600">
                          {room.room_id} | {room.location} | Capacity: {room.capacity}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            {errors.room_id && (
              <p className="mt-1 text-sm text-red-600">{errors.room_id}</p>
            )}
          </div>
          
          {/* Room Details (if selected) */}
          {selectedRoom && (
            <div className="mb-6 p-4 bg-gray-50 rounded-md">
              <h3 className="font-medium text-gray-900 mb-2">Room Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Location: <span className="text-gray-900">{selectedRoom.location}</span></p>
                  <p className="text-sm text-gray-600">Capacity: <span className="text-gray-900">{selectedRoom.capacity} people</span></p>
                </div>
                <div>
                  {selectedRoom.features && selectedRoom.features.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Features:</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedRoom.features.map((feature, index) => (
                          <span key={index} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {selectedRoom.description && (
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-600">Description: <span className="text-gray-900">{selectedRoom.description}</span></p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Note */}
          <div className="mb-6">
            <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-1">
              Note (Optional)
            </label>
            <textarea
              id="note"
              name="note"
              rows={3}
              value={formData.note}
              onChange={handleChange}
              placeholder="Add any special requirements or additional information"
              className="w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 shadow-sm"
            ></textarea>
          </div>
          
          {/* Error message */}
          {submitError && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
              <p className="flex items-center font-medium">
                <FiAlertCircle className="mr-2" /> Error
              </p>
              <p>{submitError}</p>
            </div>
          )}
          
          {/* Submit */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mr-4"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || roomsLoading || !formData.room_id}
              className={`px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                (loading || roomsLoading || !formData.room_id) ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? 'Submitting...' : 'Submit Booking Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}