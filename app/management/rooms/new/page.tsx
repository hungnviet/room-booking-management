'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiSave, FiX, FiPlus, FiMinus } from 'react-icons/fi';

export default function AddRoomPage() {
  const router = useRouter();
  
  // Form state
  const [formData, setFormData] = useState({
    room_id: '',
    name: '',
    location: '',
    capacity: '',
    description: '',
    isActive: true,
    features: [''] // Start with one empty feature field
  });
  
  // Validation and submission state
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  // Handle form field changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  // Handle checkbox changes
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }));
  };
  
  // Handle feature field changes
  const handleFeatureChange = (index: number, value: string) => {
    const updatedFeatures = [...formData.features];
    updatedFeatures[index] = value;
    
    setFormData(prev => ({
      ...prev,
      features: updatedFeatures
    }));
  };
  
  // Add a new feature field
  const addFeatureField = () => {
    setFormData(prev => ({
      ...prev,
      features: [...prev.features, '']
    }));
  };
  
  // Remove a feature field
  const removeFeatureField = (index: number) => {
    const updatedFeatures = formData.features.filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      features: updatedFeatures
    }));
  };
  
  // Validate form data
  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!formData.room_id.trim()) {
      newErrors.room_id = 'Room ID is required';
    }
    
    if (!formData.name.trim()) {
      newErrors.name = 'Room name is required';
    }
    
    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }
    
    if (!formData.capacity) {
      newErrors.capacity = 'Capacity is required';
    } else if (parseInt(formData.capacity) < 1) {
      newErrors.capacity = 'Capacity must be at least 1';
    }
    
    // Filter out empty feature fields
    const nonEmptyFeatures = formData.features.filter(feature => feature.trim() !== '');
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      // Filter out empty features
      const nonEmptyFeatures = formData.features.filter(feature => feature.trim() !== '');
      
      const response = await fetch('/api/management/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          capacity: parseInt(formData.capacity),
          features: nonEmptyFeatures
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 409) {
          setErrors(prev => ({
            ...prev,
            room_id: 'Room ID already exists'
          }));
        } else if (response.status === 403) {
          setSubmitError('You do not have permission to create rooms');
        } else if (data.errors) {
          // Handle validation errors from the server
          const serverErrors: {[key: string]: string} = {};
          data.errors.forEach((error: string) => {
            // Extract field name from error message if possible
            const match = error.match(/^([a-zA-Z_]+):/);
            if (match && match[1]) {
              serverErrors[match[1]] = error;
            } else {
              // If we can't extract field name, set as general error
              setSubmitError(error);
            }
          });
          setErrors(prev => ({ ...prev, ...serverErrors }));
        } else {
          setSubmitError(data.message || 'Failed to create room');
        }
        return;
      }
      
      // Success - redirect to rooms management page
      router.push('/management/rooms');
      router.refresh(); // Refresh the page to show the new room
      
    } catch (error) {
      console.error('Error creating room:', error);
      setSubmitError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Add New Room</h1>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
        >
          Cancel
        </button>
      </div>
      
      {/* Error message */}
      {submitError && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
          <p className="font-medium">Error</p>
          <p>{submitError}</p>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Room ID */}
            <div>
              <label htmlFor="room_id" className="block text-sm font-medium text-gray-700 mb-1">
                Room ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="room_id"
                name="room_id"
                value={formData.room_id}
                onChange={handleChange}
                className={`w-full rounded-md ${
                  errors.room_id ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                } shadow-sm`}
                placeholder="e.g., R101"
              />
              {errors.room_id && (
                <p className="mt-1 text-sm text-red-600">{errors.room_id}</p>
              )}
            </div>
            
            {/* Room Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Room Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`w-full rounded-md ${
                  errors.name ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                } shadow-sm`}
                placeholder="e.g., Conference Room A"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>
            
            {/* Location */}
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                Location <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                className={`w-full rounded-md ${
                  errors.location ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                } shadow-sm`}
                placeholder="e.g., Building A, 2nd Floor"
              />
              {errors.location && (
                <p className="mt-1 text-sm text-red-600">{errors.location}</p>
              )}
            </div>
            
            {/* Capacity */}
            <div>
              <label htmlFor="capacity" className="block text-sm font-medium text-gray-700 mb-1">
                Capacity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="capacity"
                name="capacity"
                min="1"
                value={formData.capacity}
                onChange={handleChange}
                className={`w-full rounded-md ${
                  errors.capacity ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                } shadow-sm`}
                placeholder="e.g., 10"
              />
              {errors.capacity && (
                <p className="mt-1 text-sm text-red-600">{errors.capacity}</p>
              )}
            </div>
            
            {/* Description */}
            <div className="md:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                value={formData.description}
                onChange={handleChange}
                className="w-full rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                placeholder="Enter room description..."
              />
            </div>
            
            {/* Features */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Features</label>
              
              {formData.features.map((feature, index) => (
                <div key={index} className="flex items-center mb-2">
                  <input
                    type="text"
                    value={feature}
                    onChange={(e) => handleFeatureChange(index, e.target.value)}
                    className="flex-1 rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                    placeholder={`Feature ${index + 1}`}
                  />
                  
                  <button
                    type="button"
                    onClick={() => removeFeatureField(index)}
                    className="ml-2 p-2 text-red-600 hover:text-red-800"
                    title="Remove feature"
                  >
                    <FiMinus />
                  </button>
                </div>
              ))}
              
              <button
                type="button"
                onClick={addFeatureField}
                className="mt-2 flex items-center text-blue-600 hover:text-blue-800"
              >
                <FiPlus className="mr-1" /> Add Feature
              </button>
            </div>
            
            {/* Active Status */}
            <div className="md:col-span-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleCheckboxChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                  Room is active and available for booking
                </label>
              </div>
            </div>
          </div>
          
          {/* Submit and Cancel buttons */}
          <div className="mt-8 flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                isSubmitting ? 'opacity-75 cursor-not-allowed' : ''
              }`}
            >
              <FiSave className="mr-2" />
              {isSubmitting ? 'Saving...' : 'Save Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}