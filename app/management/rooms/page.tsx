'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FiSearch, FiRefreshCw, FiEdit, FiTrash2, FiPlus, 
  FiChevronDown, FiChevronUp, FiCheckCircle, FiXCircle,
  FiInfo, FiCalendar, FiUsers
} from 'react-icons/fi';

// Room type definition
interface Room {
  id: string;
  room_id: string;
  name: string;
  location: string;
  capacity: number;
  isActive: boolean;
  features: string[];
  description: string;
  schedules?: Schedule[];
  createdAt: string;
  updatedAt: string;
}

// Schedule type definition
interface Schedule {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  user_id: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

// Pagination info type
interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export default function RoomsManagementPage() {
  // State for rooms data
  const [rooms, setRooms] = useState<Room[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });
  
  // State for filters
  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [minCapacity, setMinCapacity] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [includeSchedules, setIncludeSchedules] = useState(false);
  
  // State for sorting
  const [sortBy, setSortBy] = useState('room_id');
  const [sortOrder, setSortOrder] = useState('asc');
  
  // State for loading and error
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for expanded room details
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null);
  
  // State for locations (for filter dropdown)
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);
  
  const router = useRouter();

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch (error) {
      return dateString;
    }
  };

  // Fetch rooms based on current filters and pagination
  const fetchRooms = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Build query string
      const queryParams = new URLSearchParams();
      queryParams.append('page', pagination.page.toString());
      queryParams.append('limit', pagination.limit.toString());
      queryParams.append('sortBy', sortBy);
      queryParams.append('sortOrder', sortOrder);
      
      if (search) queryParams.append('search', search);
      if (locationFilter) queryParams.append('location', locationFilter);
      if (minCapacity) queryParams.append('minCapacity', minCapacity);
      if (activeFilter) queryParams.append('isActive', activeFilter);
      if (includeSchedules) queryParams.append('includeSchedules', 'true');
      
      const response = await fetch(`/api/management/rooms?${queryParams.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      setRooms(data.rooms);
      setPagination(data.pagination);
      
      // Extract unique locations for filter dropdown
      if (data.rooms.length > 0) {
        const locations = [...new Set(data.rooms.map((room: Room) => room.location))] as string[];
        setAvailableLocations(locations);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rooms');
      console.error('Failed to fetch rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch rooms on initial load and when filters change
  useEffect(() => {
    fetchRooms();
  }, [
    pagination.page, 
    pagination.limit, 
    sortBy, 
    sortOrder, 
    locationFilter, 
    activeFilter,
    includeSchedules
  ]);

  // Handle search form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
    fetchRooms();
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  // Handle sorting
  const handleSort = (column: string) => {
    if (sortBy === column) {
      // Toggle order if same column
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column and default to asc
      setSortBy(column);
      setSortOrder('asc');
    }
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Handle room deletion
  const handleDeleteRoom = async (id: string, roomId: string) => {
    if (!confirm(`Are you sure you want to delete room ${roomId}? This action cannot be undone.`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/management/rooms?id=${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete room');
      }
      
      // Remove room from state
      setRooms(rooms.filter(room => room.id !== id));
      alert('Room deleted successfully');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete room');
      console.error('Error deleting room:', err);
    }
  };

  // Handle edit room
  const handleEditRoom = (id: string) => {
    router.push(`/management/rooms/edit/${id}`);
  };

  // Toggle expanded room details
  const toggleRoomDetails = (id: string) => {
    setExpandedRoom(expandedRoom === id ? null : id);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between mb-6">
        <h1 className="text-2xl font-bold">Room Management</h1>
        <button
          onClick={() => router.push('/management/rooms/new')}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <FiPlus className="mr-2" /> Add New Room
        </button>
      </div>
      
      {/* Filters and search */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search room ID, name, or description"
                className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
          </div>
          
          <div className="w-40">
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <select
              value={locationFilter}
              onChange={(e) => {
                setLocationFilter(e.target.value);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">All Locations</option>
              {availableLocations.map(location => (
                <option key={location} value={location}>{location}</option>
              ))}
            </select>
          </div>
          
          <div className="w-40">
            <label className="block text-sm font-medium text-gray-700 mb-1">Min Capacity</label>
            <input
              type="number"
              min="1"
              value={minCapacity}
              onChange={(e) => {
                setMinCapacity(e.target.value);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              placeholder="Any capacity"
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          
          <div className="w-40">
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={activeFilter}
              onChange={(e) => {
                setActiveFilter(e.target.value);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
          
          <div className="flex items-center">
            <input
              id="includeSchedules"
              type="checkbox"
              checked={includeSchedules}
              onChange={(e) => setIncludeSchedules(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="includeSchedules" className="ml-2 block text-sm text-gray-700">
              Include Schedules
            </label>
          </div>
          
          <div className="flex space-x-2">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Search
            </button>
            
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setLocationFilter('');
                setMinCapacity('');
                setActiveFilter('');
                setIncludeSchedules(false);
                setSortBy('room_id');
                setSortOrder('asc');
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Reset
            </button>
          </div>
        </form>
      </div>
      
      {/* Error message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
          <p className="font-medium">Error</p>
          <p>{error}</p>
          <button 
            onClick={fetchRooms}
            className="mt-2 flex items-center text-red-700 hover:text-red-900"
          >
            <FiRefreshCw className="mr-1" /> Try again
          </button>
        </div>
      )}
      
      {/* Rooms table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('room_id')}
                >
                  <div className="flex items-center">
                    Room ID
                    {sortBy === 'room_id' && (
                      sortOrder === 'asc' ? <FiChevronUp className="ml-1" /> : <FiChevronDown className="ml-1" />
                    )}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center">
                    Name
                    {sortBy === 'name' && (
                      sortOrder === 'asc' ? <FiChevronUp className="ml-1" /> : <FiChevronDown className="ml-1" />
                    )}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('location')}
                >
                  <div className="flex items-center">
                    Location
                    {sortBy === 'location' && (
                      sortOrder === 'asc' ? <FiChevronUp className="ml-1" /> : <FiChevronDown className="ml-1" />
                    )}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('capacity')}
                >
                  <div className="flex items-center">
                    Capacity
                    {sortBy === 'capacity' && (
                      sortOrder === 'asc' ? <FiChevronUp className="ml-1" /> : <FiChevronDown className="ml-1" />
                    )}
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center">
                    <div className="flex justify-center items-center">
                      <FiRefreshCw className="animate-spin h-5 w-5 mr-2 text-blue-500" />
                      Loading rooms...
                    </div>
                  </td>
                </tr>
              ) : rooms.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No rooms found
                  </td>
                </tr>
              ) : (
                rooms.map((room) => (
                  <React.Fragment key={room.id}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{room.room_id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-gray-900">{room.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                        {room.location}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                        <div className="flex items-center">
                          <FiUsers className="mr-1" /> {room.capacity}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {room.isActive ? (
                          <span className="px-2 inline-flex items-center text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            <FiCheckCircle className="mr-1" /> Active
                          </span>
                        ) : (
                          <span className="px-2 inline-flex items-center text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            <FiXCircle className="mr-1" /> Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => toggleRoomDetails(room.id)}
                            className="text-blue-600 hover:text-blue-900" 
                            title="View details"
                          >
                            <FiInfo />
                          </button>
                          <button 
                            onClick={() => handleEditRoom(room.id)}
                            className="text-blue-600 hover:text-blue-900" 
                            title="Edit room"
                          >
                            <FiEdit />
                          </button>
                          <button 
                            onClick={() => handleDeleteRoom(room.id, room.room_id)}
                            className="text-red-600 hover:text-red-900" 
                            title="Delete room"
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedRoom === room.id && (
                      <tr className="bg-gray-50">
                        <td colSpan={6} className="px-6 py-4">
                          <div className="mb-4">
                            <h3 className="text-lg font-medium mb-2">Room Details</h3>
                            
                            <div className="grid md:grid-cols-2 gap-4">
                              <div>
                                <h4 className="text-sm font-medium text-gray-500">Features</h4>
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {room.features && room.features.length > 0 ? (
                                    room.features.map((feature, index) => (
                                      <span 
                                        key={index}
                                        className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                                      >
                                        {feature}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-gray-500 text-sm">No features listed</span>
                                  )}
                                </div>
                              </div>
                              
                              <div>
                                <h4 className="text-sm font-medium text-gray-500">Description</h4>
                                <p className="mt-1 text-sm text-gray-700">
                                  {room.description || "No description available"}
                                </p>
                              </div>
                            </div>
                            
                            {includeSchedules && room.schedules && room.schedules.length > 0 && (
                              <div className="mt-6">
                                <h4 className="text-md font-medium mb-2">Room Schedules</h4>
                                <div className="overflow-x-auto">
                                  <table className="min-w-full divide-y divide-gray-200">
                                    <thead>
                                      <tr>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Start Time</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">End Time</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">User ID</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Note</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                      {room.schedules.map(schedule => (
                                        <tr key={schedule.id}>
                                          <td className="px-3 py-2 whitespace-nowrap text-sm">
                                            {formatDate(schedule.date)}
                                          </td>
                                          <td className="px-3 py-2 whitespace-nowrap text-sm">
                                            {formatDate(schedule.start_time)}
                                          </td>
                                          <td className="px-3 py-2 whitespace-nowrap text-sm">
                                            {formatDate(schedule.end_time)}
                                          </td>
                                          <td className="px-3 py-2 whitespace-nowrap text-sm">
                                            {schedule.user_id}
                                          </td>
                                          <td className="px-3 py-2 text-sm">
                                            {schedule.note || "No notes"}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {!loading && rooms.length > 0 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(pagination.page * pagination.limit, pagination.total)}
                  </span>{' '}
                  of <span className="font-medium">{pagination.total}</span> rooms
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={!pagination.hasPrevPage}
                  className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                    pagination.hasPrevPage 
                      ? 'bg-white text-gray-700 hover:bg-gray-50' 
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={!pagination.hasNextPage}
                  className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                    pagination.hasNextPage 
                      ? 'bg-white text-gray-700 hover:bg-gray-50' 
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}