import { connectToDB } from "@/lib/mongodb";
import Booking from "@/lib/models/Booking";
import Room from "@/lib/models/Room";
import User from "@/lib/models/User";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import mongoose from "mongoose";

// Get bookings with filtering (admin: all bookings, staff: own bookings)
export async function GET(request: Request) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const status = searchParams.get("status");
    const roomId = searchParams.get("roomId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    
    // Get user information from cookies
    const cookieStore = await cookies();
    const userId = cookieStore.get("userId")?.value;
    const role = cookieStore.get("role")?.value;
    
    if (!userId) {
      return NextResponse.json({ 
        message: "Unauthorized: Please log in" 
      }, { status: 401 });
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Build query
    const query: any = {};
    
    // Staff can only see their own bookings
    if (role !== "admin") {
      query.user_id = userId;
    }
    
    // Add filters if provided
    if (status) {
      query.status = status.toUpperCase();
    }
    
    if (roomId) {
      query.room_id = roomId;
    }
    
    // Date range filter
    if (startDate) {
      query.booking_date = query.booking_date || {};
      query.booking_date.$gte = new Date(startDate);
    }
    
    if (endDate) {
      query.booking_date = query.booking_date || {};
      query.booking_date.$lte = new Date(endDate);
    }
    
    // Connect to database
    await connectToDB();
    
    // Build sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    // Get bookings with pagination
    const bookings = await Booking.find(query)
      .populate('room_id', 'room_id name location')
      .populate('user_id', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limit);
    
    // Get total count for pagination
    const total = await Booking.countDocuments(query);
    
    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    // Build response
    const response = {
      bookings: bookings.map((booking: any) => ({
        id: booking._id,
        booking_id: booking.booking_id,
        room: {
          id: booking.room_id._id,
          room_id: booking.room_id.room_id,
          name: booking.room_id.name,
          location: booking.room_id.location,
        },
        user: {
          id: booking.user_id._id,
          name: booking.user_id.name,
          email: booking.user_id.email,
        },
        booking_date: booking.booking_date,
        start_time: booking.start_time,
        end_time: booking.end_time,
        note: booking.note,
        status: booking.status,
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage,
        hasPrevPage
      }
    };
    
    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error("Error fetching bookings:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ 
      message: "Error fetching bookings",
      error: errorMessage
    }, { status: 500 });
  }
}

// Create a new booking request (staff)
export async function POST(request: Request) {
  try {
    // Get user information from cookies
    const cookieStore =  await cookies();
    const userId = cookieStore.get("userId")?.value;
    const role = cookieStore.get("role")?.value;
    
    if (!userId) {
      return NextResponse.json({ 
        message: "Unauthorized: Please log in" 
      }, { status: 401 });
    }
    
    // Parse request body
    const body = await request.json();
    const { 
      room_id,
      booking_date,
      start_time,
      end_time,
      note
    } = body;
    
    // Validation
    if (!room_id || !booking_date || !start_time || !end_time) {
      return NextResponse.json({ 
        message: "Missing required fields" 
      }, { status: 400 });
    }
    
    // Connect to database
    await connectToDB();
    
    // Check if room exists and is active
    const room = await Room.findById(room_id);
    if (!room) {
      return NextResponse.json({ 
        message: "Room not found" 
      }, { status: 404 });
    }
    
    if (!room.isActive) {
      return NextResponse.json({ 
        message: "Room is not active for booking" 
      }, { status: 400 });
    }
    
    // Format dates
    const parsedBookingDate = new Date(booking_date);
    const parsedStartTime = new Date(start_time);
    const parsedEndTime = new Date(end_time);
    
    // Validate times
    if (parsedStartTime >= parsedEndTime) {
      return NextResponse.json({ 
        message: "End time must be after start time" 
      }, { status: 400 });
    }
    
    // Check for time conflicts with existing schedules
    const hasConflict = room.schedules?.some((schedule: any) => {
      // Check if on the same date
      const scheduleDate = new Date(schedule.date);
      const sameDate = 
        scheduleDate.getFullYear() === parsedBookingDate.getFullYear() &&
        scheduleDate.getMonth() === parsedBookingDate.getMonth() &&
        scheduleDate.getDate() === parsedBookingDate.getDate();
        
      if (!sameDate) return false;
      
      // Check time overlap
      const scheduleStart = new Date(schedule.start_time);
      const scheduleEnd = new Date(schedule.end_time);
      
      return (
        (parsedStartTime >= scheduleStart && parsedStartTime < scheduleEnd) || // Start time is during existing schedule
        (parsedEndTime > scheduleStart && parsedEndTime <= scheduleEnd) || // End time is during existing schedule
        (parsedStartTime <= scheduleStart && parsedEndTime >= scheduleEnd) // Booking completely covers existing schedule
      );
    });
    
    if (hasConflict) {
      return NextResponse.json({ 
        message: "Room is already booked for the selected time" 
      }, { status: 409 });
    }
    
    // Check for conflicts with pending/accepted bookings
    const bookingConflict = await Booking.findOne({
      room_id: room_id,
      booking_date: {
        $gte: new Date(parsedBookingDate.setHours(0, 0, 0, 0)),
        $lte: new Date(parsedBookingDate.setHours(23, 59, 59, 999))
      },
      status: { $in: ["PENDING", "ACCEPTED"] },
      $or: [
        { start_time: { $gte: parsedStartTime, $lt: parsedEndTime } },
        { end_time: { $gt: parsedStartTime, $lte: parsedEndTime } },
        { 
          $and: [
            { start_time: { $lte: parsedStartTime } }, 
            { end_time: { $gte: parsedEndTime } }
          ] 
        }
      ]
    });
    
    if (bookingConflict) {
      return NextResponse.json({ 
        message: "There is a pending or accepted booking for this time slot" 
      }, { status: 409 });
    }
    
    // Generate a unique booking ID
    const bookingCount = await Booking.countDocuments();
    const bookingId = `BK${String(bookingCount + 1).padStart(5, '0')}`;
    
    // Create new booking
    const newBooking = await Booking.create({
      booking_id: bookingId,
      user_id: userId,
      room_id: room_id,
      booking_date: parsedBookingDate,
      start_time: parsedStartTime,
      end_time: parsedEndTime,
      note: note || "",
      status: "PENDING"
    });
    
    // Populate the room and user information
    const populatedBooking = await Booking.findById(newBooking._id)
      .populate('room_id', 'room_id name location')
      .populate('user_id', 'name email');
    
    return NextResponse.json({ 
      message: "Booking request created successfully",
      booking: {
        id: populatedBooking._id,
        booking_id: populatedBooking.booking_id,
        room: {
          id: populatedBooking.room_id._id,
          room_id: populatedBooking.room_id.room_id,
          name: populatedBooking.room_id.name,
          location: populatedBooking.room_id.location,
        },
        user: {
          id: populatedBooking.user_id._id,
          name: populatedBooking.user_id.name,
          email: populatedBooking.user_id.email,
        },
        booking_date: populatedBooking.booking_date,
        start_time: populatedBooking.start_time,
        end_time: populatedBooking.end_time,
        note: populatedBooking.note,
        status: populatedBooking.status,
        createdAt: populatedBooking.createdAt,
        updatedAt: populatedBooking.updatedAt
      }
    }, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating booking:", error);
    
    // Handle validation errors
    if (typeof error === 'object' && error !== null && 'name' in error && error.name === 'ValidationError') {
      const mongoError = error as any;
      const errors = Object.values(mongoError.errors).map((err: any) => err.message);
      
      return NextResponse.json({ 
        message: "Validation failed", 
        errors 
      }, { status: 400 });
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ 
      message: "Error creating booking",
      error: errorMessage
    }, { status: 500 });
  }
}

// Update booking status (admin only)
export async function PUT(request: Request) {
  try {
    // Get user information from cookies
    const cookieStore = await cookies();
    const userId = cookieStore.get("userId")?.value;
    const role = cookieStore.get("role")?.value;
    
    // Only admin can update booking status
    if (role !== "admin") {
      return NextResponse.json({ 
        message: "Unauthorized: Admin access required" 
      }, { status: 403 });
    }
    
    // Parse request body
    const body = await request.json();
    const { 
      bookingId,
      status,
      adminNote
    } = body;
    
    // Validation
    if (!bookingId || !status) {
      return NextResponse.json({ 
        message: "Booking ID and status are required" 
      }, { status: 400 });
    }
    
    if (!["ACCEPTED", "REJECTED"].includes(status)) {
      return NextResponse.json({ 
        message: "Invalid status. Must be ACCEPTED or REJECTED" 
      }, { status: 400 });
    }
    
    // Connect to database
    await connectToDB();
    
    // Find the booking
    console.log("Booking ID:", bookingId);
    const booking = await Booking.findOne({ booking_id : bookingId });
    if (!booking) {
      return NextResponse.json({ 
        message: "Booking not found" 
      }, { status: 404 });
    }
    
    // Can only update PENDING bookings
    if (booking.status !== "PENDING") {
      return NextResponse.json({ 
        message: "Only pending bookings can be updated" 
      }, { status: 400 });
    }
    
    // Start transaction for atomicity
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Update booking status
      const updatedBooking = await Booking.findByIdAndUpdate(
        booking._id,
        { 
          status,
          note: adminNote ? `${booking.note || ''}\n\nAdmin Note: ${adminNote}` : booking.note 
        },
        { new: true, runValidators: true, session }
      );
      
      // If accepted, add to room schedules
      if (status === "ACCEPTED") {
        // Get the room
        const room = await Room.findById(booking.room_id).session(session);
        if (!room) {
          await session.abortTransaction();
          session.endSession();
          return NextResponse.json({ 
            message: "Room not found" 
          }, { status: 404 });
        }
        
        // Check for conflicts again (double-check)
        const hasConflict = room.schedules?.some((schedule: any) => {
          // Check if on the same date
          const scheduleDate = new Date(schedule.date);
          const bookingDate = new Date(booking.booking_date);
          const sameDate = 
            scheduleDate.getFullYear() === bookingDate.getFullYear() &&
            scheduleDate.getMonth() === bookingDate.getMonth() &&
            scheduleDate.getDate() === bookingDate.getDate();
            
          if (!sameDate) return false;
          
          // Check time overlap
          const scheduleStart = new Date(schedule.start_time);
          const scheduleEnd = new Date(schedule.end_time);
          const bookingStart = new Date(booking.start_time);
          const bookingEnd = new Date(booking.end_time);
          
          return (
            (bookingStart >= scheduleStart && bookingStart < scheduleEnd) || 
            (bookingEnd > scheduleStart && bookingEnd <= scheduleEnd) || 
            (bookingStart <= scheduleStart && bookingEnd >= scheduleEnd)
          );
        });
        
        if (hasConflict) {
          await session.abortTransaction();
          session.endSession();
          return NextResponse.json({ 
            message: "Room is already booked for the selected time" 
          }, { status: 409 });
        }
        console.log("No conflict found, proceeding to add schedule");
        // Add to room schedules
        const scheduleDate = new Date(booking.booking_date);
        const startTime = new Date(booking.start_time);
        const endTime = new Date(booking.end_time);
        const userId = new mongoose.Types.ObjectId(booking.user_id);

        // Add to room schedules with explicit type conversions
        const result = await Room.findByIdAndUpdate(
          booking.room_id,
          {
            $push: {
              schedules: {
                date: scheduleDate,
                start_time: startTime,
                end_time: endTime,
                user_id: userId,
                note: booking.note || ""
              }
            }
          },
          { 
            session,
            new: true, // Return the updated document
            runValidators: true // Run schema validation
          }
        );

        // Log the result for debugging
        console.log("Room update result:", result ? "Success" : "Failed", 
          "Schedule count:", result?.schedules?.length || 0);

        // Verify that the update worked
        if (!result || !result.schedules || result.schedules.length === 0) {
          console.error("Failed to add schedule to room");
          await session.abortTransaction();
          session.endSession();
          return NextResponse.json({ 
            message: "Error adding schedule to room" 
          }, { status: 500 });
        }
      }
      
      // Commit transaction
      await session.commitTransaction();
      session.endSession();
      
      // Populate the room and user information for response
      const populatedBooking = await Booking.findById(booking._id)
        .populate('room_id', 'room_id name location')
        .populate('user_id', 'name email');
      
      return NextResponse.json({ 
        message: `Booking ${status === "ACCEPTED" ? "approved" : "rejected"} successfully`,
        booking: {
          id: populatedBooking._id,
          booking_id: populatedBooking.booking_id,
          room: {
            id: populatedBooking.room_id._id,
            room_id: populatedBooking.room_id.room_id,
            name: populatedBooking.room_id.name,
            location: populatedBooking.room_id.location,
          },
          user: {
            id: populatedBooking.user_id._id,
            name: populatedBooking.user_id.name,
            email: populatedBooking.user_id.email,
          },
          booking_date: populatedBooking.booking_date,
          start_time: populatedBooking.start_time,
          end_time: populatedBooking.end_time,
          note: populatedBooking.note,
          status: populatedBooking.status,
          updatedAt: populatedBooking.updatedAt
        }
      });
    } catch (error) {
      // If error occurs, abort transaction
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error: unknown) {
    console.error("Error updating booking:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ 
      message: "Error updating booking",
      error: errorMessage
    }, { status: 500 });
  }
}

// DELETE: Cancel a booking
export async function DELETE(request: Request) {
  try {
    // Get user information from cookies
    const cookieStore = await cookies();
    const userId = cookieStore.get("user_id")?.value;
    const role = cookieStore.get("role")?.value;
    
    if (!userId) {
      return NextResponse.json({ 
        message: "Unauthorized: Please log in" 
      }, { status: 401 });
    }
    
    // Get booking ID from query parameters
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get("booking_id");
    
    if (!bookingId) {
      return NextResponse.json({ 
        message: "Booking ID is required" 
      }, { status: 400 });
    }
    
    // Connect to database
    await connectToDB();
    
    // Find the booking
    const booking = await Booking.findOne({ booking_id: bookingId });
    if (!booking) {
      return NextResponse.json({ 
        message: "Booking not found" 
      }, { status: 404 });
    }
    
    // Staff can only cancel their own bookings
    if (role !== "admin" && booking.user_id.toString() !== userId) {
      return NextResponse.json({ 
        message: "Unauthorized: You can only cancel your own bookings" 
      }, { status: 403 });
    }
    
    // Start transaction
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // If booking was accepted, remove from room schedules
      if (booking.status === "ACCEPTED") {
        // Find related schedule in room and remove it
        await Room.updateOne(
          { _id: booking.room_id },
          {
            $pull: {
              schedules: {
                date: booking.booking_date,
                start_time: booking.start_time,
                end_time: booking.end_time,
                user_id: booking.user_id
              }
            }
          },
          { session }
        );
      }
      
      // Delete the booking
      await Booking.findByIdAndDelete(booking._id, { session });
      
      // Commit transaction
      await session.commitTransaction();
      session.endSession();
      
      return NextResponse.json({ 
        message: "Booking cancelled successfully",
        booking_id: bookingId
      });
    } catch (error) {
      // If error occurs, abort transaction
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error: unknown) {
    console.error("Error cancelling booking:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ 
      message: "Error cancelling booking",
      error: errorMessage
    }, { status: 500 });
  }
}