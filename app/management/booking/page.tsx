'use client';

import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';

interface Booking {
  id: string;
  booking_id: string;
  room: {
    id: string;
    room_id: string;
    name: string;
    location: string;
  };
  user: {
    id: string;
    name: string;
    email: string;
  };
  booking_date: string;
  start_time: string;
  end_time: string;
  note: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
}

export default function BookingManagementPage() {
  const [activeTab, setActiveTab] = useState('pending');
  const [bookings, setBookings] = useState<{
    pending: Booking[];
    approved: Booking[];
    rejected: Booking[];
  }>({
    pending: [],
    approved: [],
    rejected: [],
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [filters, setFilters] = useState({
    roomId: '',
    startDate: '',
    endDate: '',
    search: ''
  });
  const [message, setMessage] = useState({ type: '', text: '' });

  // Toast message handling
  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Fetch bookings based on status
  const fetchBookings = async (status?: string) => {
    try {
      setIsLoading(true);
      
      // Build query parameters
      const queryParams = new URLSearchParams();
      if (status) {
        queryParams.append('status', status);
      }
      if (filters.roomId) {
        queryParams.append('roomId', filters.roomId);
      }
      if (filters.startDate) {
        queryParams.append('startDate', new Date(filters.startDate).toISOString());
      }
      if (filters.endDate) {
        queryParams.append('endDate', new Date(filters.endDate).toISOString());
      }
      
      const response = await fetch(`/api/booking?${queryParams.toString()}`);
      
      if (!response.ok) {
        console.log(`Error ${response.status}: ${await response.text()}`);
      }
      
      const data = await response.json();
      
      // Group bookings by status
      const pending: Booking[] = [];
      const approved: Booking[] = [];
      const rejected: Booking[] = [];
      
      data.bookings.forEach((booking: Booking) => {
        if (filters.search && 
            !booking.booking_id.includes(filters.search) && 
            !booking.room.name.toLowerCase().includes(filters.search.toLowerCase()) &&
            !booking.user.name.toLowerCase().includes(filters.search.toLowerCase())) {
          return;
        }
        
        switch (booking.status) {
          case 'PENDING':
            pending.push(booking);
            break;
          case 'ACCEPTED':
            approved.push(booking);
            break;
          case 'REJECTED':
            rejected.push(booking);
            break;
        }
      });
      
      setBookings({ pending, approved, rejected });
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setMessage({ 
        type: 'error', 
        text: 'Failed to load bookings' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch on component mount
  useEffect(() => {
    fetchBookings();
  }, []);

  const formatTimeDisplay = (timeValue: string) => {
    try {
      // Handle different possible time formats
      if (!timeValue) return "N/A";
      
      // If it's already in HH:MM format (like "14:30")
      if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(timeValue)) {
        const [hours, minutes] = timeValue.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes, 0);
        return format(date, 'h:mm a');
      }
      
      // If it's a full ISO date string (like "2023-04-17T14:30:00")
      if (timeValue.includes('T')) {
        return format(new Date(timeValue), 'h:mm a');
      }
      
      // Default fallback for any other format
      return timeValue;
    } catch (error) {
      console.error("Error formatting time:", timeValue, error);
      return timeValue || "N/A";
    }
  };

  // Handle booking status update
  const updateBookingStatus = async (bookingId: string, status: 'ACCEPTED' | 'REJECTED') => {
    try {
      const response = await fetch('/api/booking', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bookingId,status }),
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${await response.text()}`);
      }
      
      // Refetch bookings to update the list
      fetchBookings();
      
      setMessage({ 
        type: 'success', 
        text: `Booking ${status === 'ACCEPTED' ? 'approved' : 'rejected'} successfully` 
      });
    } catch (err) {
      console.error('Error updating booking status:', err);
      setMessage({ 
        type: 'error', 
        text: `Failed to ${status === 'ACCEPTED' ? 'approve' : 'reject'} booking` 
      });
    }
  };

  // Handle action confirmation
  const handleActionConfirmation = () => {
    if (!selectedBooking || !actionType) return;
    
    updateBookingStatus(
      selectedBooking.booking_id, 
      actionType === 'approve' ? 'ACCEPTED' : 'REJECTED'
    );
    
    setConfirmDialogOpen(false);
    setSelectedBooking(null);
    setActionType(null);
  };

  // Prepare action dialog
  const openActionDialog = (booking: Booking, action: 'approve' | 'reject') => {
    setSelectedBooking(booking);
    setActionType(action);
    setConfirmDialogOpen(true);
  };

  // Handle filter changes
  const applyFilters = () => {
    setFilterDialogOpen(false);
    fetchBookings();
  };

  const resetFilters = () => {
    setFilters({
      roomId: '',
      startDate: '',
      endDate: '',
      search: ''
    });
  };

  // Render booking card
  const renderBookingCard = (booking: Booking) => (
    <div key={booking.id} className="border rounded-lg shadow-sm mb-4 overflow-hidden">
      <div className="p-4 pb-2 border-b">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold">Booking #{booking.booking_id}</h3>
            <p className="text-sm text-gray-500">
              Created on {format(new Date(booking.createdAt), 'PPP')}
            </p>
          </div>
          <span className={`inline-block px-2 py-1 text-xs rounded-full ${
            booking.status === 'ACCEPTED' ? 'bg-green-100 text-green-800' : 
            booking.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 
            'bg-yellow-100 text-yellow-800'
          }`}>
            {booking.status}
          </span>
        </div>
      </div>
      <div className="p-4">
        <div className="space-y-3">
          <div className="flex items-center">
            <span className="mr-2 text-gray-500">📅</span>
            <span>
              {format(new Date(booking.booking_date), 'PPP')}
            </span>
          </div>
          <div className="flex items-center">
            <span className="mr-2 text-gray-500">⏰</span>
            <span>
                {formatTimeDisplay(booking.start_time)} - {formatTimeDisplay(booking.end_time)}
            </span>
        </div>
          <div className="flex items-center">
            <span className="mr-2 text-gray-500">📍</span>
            <span>
              {booking.room.name} ({booking.room.room_id}) - {booking.room.location}
            </span>
          </div>
          <div className="flex items-center">
            <span className="mr-2 text-gray-500">👤</span>
            <span>
              {booking.user.name} ({booking.user.email})
            </span>
          </div>
          {booking.note && (
            <div className="flex items-start">
              <span className="mr-2 text-gray-500">📝</span>
              <span>{booking.note}</span>
            </div>
          )}
          
          {booking.status === 'PENDING' && (
            <div className="flex space-x-2 mt-4">
              <button 
                className="px-4 py-2 border border-green-500 text-green-600 rounded hover:bg-green-50"
                onClick={() => openActionDialog(booking, 'approve')}
              >
                Approve
              </button>
              <button 
                className="px-4 py-2 border border-red-500 text-red-600 rounded hover:bg-red-50"
                onClick={() => openActionDialog(booking, 'reject')}
              >
                Reject
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Render skeleton loading state
  const renderSkeleton = () => (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="border rounded-lg p-4 space-y-3">
          <div className="h-5 bg-gray-200 rounded w-1/3 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Toast message */}
      {message.text && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-md shadow-md ${
          message.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
        }`}>
          {message.text}
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Booking Management</h1>
        <div className="flex space-x-2">
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">🔍</span>
            <input 
              type="text"
              placeholder="Search bookings..." 
              className="pl-9 py-2 pr-3 border rounded w-60"
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
            />
          </div>
          <button 
            className="px-4 py-2 border rounded flex items-center"
            onClick={() => setFilterDialogOpen(true)}
          >
            <span className="mr-2">🔍</span>
            Filters
          </button>
        </div>
      </div>

      {/* Custom Tab Navigation */}
      <div className="mb-6">
        <div className="border-b flex">
          <button
            className={`px-4 py-2 border-b-2 ${
              activeTab === 'pending' 
                ? 'border-blue-500 text-blue-600 font-medium' 
                : 'border-transparent text-gray-500'
            }`}
            onClick={() => setActiveTab('pending')}
          >
            Pending
            {bookings.pending.length > 0 && (
              <span className="ml-2 bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full">
                {bookings.pending.length}
              </span>
            )}
          </button>
          <button
            className={`px-4 py-2 border-b-2 ${
              activeTab === 'approved' 
                ? 'border-blue-500 text-blue-600 font-medium' 
                : 'border-transparent text-gray-500'
            }`}
            onClick={() => setActiveTab('approved')}
          >
            Approved
            {bookings.approved.length > 0 && (
              <span className="ml-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                {bookings.approved.length}
              </span>
            )}
          </button>
          <button
            className={`px-4 py-2 border-b-2 ${
              activeTab === 'rejected' 
                ? 'border-blue-500 text-blue-600 font-medium' 
                : 'border-transparent text-gray-500'
            }`}
            onClick={() => setActiveTab('rejected')}
          >
            Rejected
            {bookings.rejected.length > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {bookings.rejected.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'pending' && (
          <div className="space-y-4">
            {isLoading ? (
              renderSkeleton()
            ) : bookings.pending.length > 0 ? (
              bookings.pending.map(renderBookingCard)
            ) : (
              <div className="text-center py-10 text-gray-500">
                No pending bookings found
              </div>
            )}
          </div>
        )}

        {activeTab === 'approved' && (
          <div className="space-y-4">
            {isLoading ? (
              renderSkeleton()
            ) : bookings.approved.length > 0 ? (
              bookings.approved.map(renderBookingCard)
            ) : (
              <div className="text-center py-10 text-gray-500">
                No approved bookings found
              </div>
            )}
          </div>
        )}

        {activeTab === 'rejected' && (
          <div className="space-y-4">
            {isLoading ? (
              renderSkeleton()
            ) : bookings.rejected.length > 0 ? (
              bookings.rejected.map(renderBookingCard)
            ) : (
              <div className="text-center py-10 text-gray-500">
                No rejected bookings found
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-2">
              {actionType === 'approve' ? 'Approve Booking' : 'Reject Booking'}
            </h2>
            <p className="mb-4">
              Are you sure you want to {actionType === 'approve' ? 'approve' : 'reject'} this booking request?
            </p>
            
            {selectedBooking && (
              <div className="mt-4 p-3 bg-gray-50 rounded-md text-sm mb-6">
                <p><strong>Room:</strong> {selectedBooking.room.name}</p>
                <p><strong>Date:</strong> {format(new Date(selectedBooking.booking_date), 'PPP')}</p>
                <p>
                  <strong>Time:</strong> 
                  {formatTimeDisplay(selectedBooking.start_time)} - {formatTimeDisplay(selectedBooking.end_time)}
                </p>
                <p><strong>Requester:</strong> {selectedBooking.user.name}</p>
              </div>
            )}
            
            <div className="flex justify-end space-x-2">
              <button 
                className="px-4 py-2 border rounded"
                onClick={() => setConfirmDialogOpen(false)}
              >
                Cancel
              </button>
              <button 
                className={`px-4 py-2 text-white rounded ${
                  actionType === 'approve' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-red-500 hover:bg-red-600'
                }`}
                onClick={handleActionConfirmation}
              >
                {actionType === 'approve' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter Modal */}
      {filterDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-2">Filter Bookings</h2>
            <p className="text-gray-500 mb-4">Narrow down bookings by applying filters</p>
            
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <label className="block text-sm font-medium">Room ID</label>
                <input 
                  type="text"
                  placeholder="Enter room ID" 
                  className="w-full p-2 border rounded"
                  value={filters.roomId}
                  onChange={(e) => setFilters({...filters, roomId: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium">Start Date</label>
                <input 
                  type="date"
                  className="w-full p-2 border rounded"
                  value={filters.startDate}
                  onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium">End Date</label>
                <input 
                  type="date"
                  className="w-full p-2 border rounded"
                  value={filters.endDate}
                  onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                />
              </div>
            </div>
            
            <div className="flex justify-between items-center mt-6">
              <button 
                className="px-4 py-2 border rounded"
                onClick={resetFilters}
              >
                Reset Filters
              </button>
              <button 
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                onClick={applyFilters}
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}