import { connectToDB } from "@/lib/mongodb";
import Room from "@/lib/models/Room";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// GET: Fetch rooms with filtering, sorting, and pagination
export async function GET(request: Request) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const location = searchParams.get("location");
    const minCapacity = searchParams.get("minCapacity");
    const search = searchParams.get("search");
    const isActive = searchParams.get("isActive");
    const sortBy = searchParams.get("sortBy") || "room_id";
    const sortOrder = searchParams.get("sortOrder") || "asc";
    const includeSchedules = searchParams.get("includeSchedules") === "true";
    const availableOn = searchParams.get("availableOn");
    const availableFromTimeSlot = searchParams.get("availableFromTimeSlot");
    const availableToTimeSlot = searchParams.get("availableToTimeSlot");
    const availableFrom = searchParams.get("availableFrom");
    const availableTo = searchParams.get("availableTo");

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};
    
    // Add filters if provided
    if (location) {
      query.location = { $regex: location, $options: 'i' };
    }
    
    if (minCapacity) {
      query.capacity = { $gte: parseInt(minCapacity) };
    }
    
    if (isActive !== null) {
      query.isActive = isActive === 'true';
    }
    
    // Filter by availability if dates provided
    if (availableOn) {
      // If a specific date is provided, create a date object for that day
      const queryDate = new Date(availableOn);
      const dateOnly = new Date(queryDate.setHours(0, 0, 0, 0));
      const nextDay = new Date(dateOnly);
      nextDay.setDate(nextDay.getDate() + 1);
      
      // If time slots are provided, check for availability in that time range
      if (availableFromTimeSlot && availableToTimeSlot) {
        // Parse time strings (expected format: "HH:MM")
        const [fromHours, fromMinutes] = availableFromTimeSlot.split(':').map(Number);
        const [toHours, toMinutes] = availableToTimeSlot.split(':').map(Number);
        
        // Create date objects with the requested times
        const startDateTime = new Date(dateOnly);
        startDateTime.setHours(fromHours, fromMinutes, 0, 0);
        
        const endDateTime = new Date(dateOnly);
        endDateTime.setHours(toHours, toMinutes, 0, 0);
        
        // Find rooms where there are no schedules that overlap with the requested time
        query.$or = [
          { schedules: { $size: 0 } }, // Rooms with no schedules
          {
            // Rooms where no schedule conflicts with requested time
            schedules: {
              $not: {
                $elemMatch: {
                  // Match the specific date
                  date: {
                    $gte: dateOnly,
                    $lt: nextDay
                  },
                  // Then check for time conflict on that date
                  $or: [
                    // Schedule starts during the requested time
                    { start_time: { $gte: startDateTime, $lt: endDateTime } },
                    // Schedule ends during the requested time
                    { end_time: { $gt: startDateTime, $lte: endDateTime } },
                    // Schedule completely encompasses the requested time
                    { 
                      $and: [
                        { start_time: { $lte: startDateTime } }, 
                        { end_time: { $gte: endDateTime } }
                      ] 
                    }
                  ]
                }
              }
            }
          }
        ];
      } else {
        // Otherwise, just check for the whole day availability
        query.$or = [
          { schedules: { $size: 0 } }, // Rooms with no schedules
          {
            // Rooms where no schedule falls on the requested date
            schedules: {
              $not: {
                $elemMatch: {
                  date: {
                    $gte: dateOnly,
                    $lt: nextDay
                  }
                }
              }
            }
          }
        ];
      }
    } else if (availableFrom && availableTo) {
      // If a time range is provided with full datetime
      const startDateTime = new Date(availableFrom);
      const endDateTime = new Date(availableTo);
      
      // Extract date components for date matching
      const startDate = new Date(startDateTime);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(endDateTime);
      endDate.setHours(23, 59, 59, 999);
      
      // Find rooms where there are no schedules that overlap with the requested time
      query.$or = [
        { schedules: { $size: 0 } }, // Rooms with no schedules
        {
          // Rooms where no schedule conflicts with requested time
          schedules: {
            $not: {
              $elemMatch: {
                // Match date range first
                date: {
                  $gte: startDate,
                  $lte: endDate
                },
                // Then check for time conflict
                $or: [
                  // Schedule starts during the requested time
                  { start_time: { $lt: endDateTime, $gte: startDateTime } },
                  // Schedule ends during the requested time
                  { end_time: { $gt: startDateTime, $lte: endDateTime } },
                  // Schedule completely encompasses the requested time
                  { 
                    $and: [
                      { start_time: { $lte: startDateTime } }, 
                      { end_time: { $gte: endDateTime } }
                    ] 
                  }
                ]
              }
            }
          }
        }
      ];
    }
    
    // Add search if provided (search in room_id, name, and location)
    if (search) {
      const searchQuery = { $regex: search, $options: 'i' };
      query.$or = query.$or || [];
      query.$or.push(
        { room_id: searchQuery },
        { name: searchQuery },
        { location: searchQuery },
        { description: searchQuery }
      );
    }

    // Connect to database
    await connectToDB();

    // Build sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Build projection (select which fields to return)
    const projection: any = {
      room_id: 1,
      name: 1,
      location: 1,
      capacity: 1,
      isActive: 1,
      features: 1,
      description: 1,
      createdAt: 1,
      updatedAt: 1
    };
    
    // Include schedules if requested
    if (includeSchedules) {
      projection.schedules = 1;
    }

    // Get rooms with pagination
    const rooms = await Room.find(query, projection)
      .sort(sort)
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const total = await Room.countDocuments(query);
    
    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // Build response
    const response = {
      rooms: rooms.map(room => {
        const roomObj = {
          id: room._id,
          room_id: room.room_id,
          name: room.name,
          location: room.location,
          capacity: room.capacity,
          isActive: room.isActive,
          features: room.features,
          description: room.description,
          createdAt: room.createdAt,
          updatedAt: room.updatedAt
        };
        
        // Include schedules if requested
        if (includeSchedules && room.schedules) {
          return {
            ...roomObj,
            schedules: room.schedules.map((schedule: any) => ({
              id: schedule._id,
              date: schedule.date,
              start_time: schedule.start_time,
              end_time: schedule.end_time,
              user_id: schedule.user_id,
              note: schedule.note,
              createdAt: schedule.createdAt,
              updatedAt: schedule.updatedAt
            }))
          };
        }
        
        return roomObj;
      }),
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
    console.error("Error fetching rooms:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ 
      message: "Error fetching rooms",
      error: errorMessage
    }, { status: 500 });
  }
}

// POST: Create a new room
export async function POST(request: Request) {
  try {
    // Get role from cookies
    const cookieStore = await cookies();
    const role = cookieStore.get("role")?.value;

    // Only admin can create rooms
    if (role !== "admin") {
      return NextResponse.json({ 
        message: "Unauthorized: Admin access required" 
      }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { 
      room_id, 
      name, 
      location, 
      capacity, 
      features, 
      description, 
      isActive,
      schedules = [] 
    } = body;

    // Validation
    if (!room_id || !name || !location || !capacity) {
      return NextResponse.json({ 
        message: "Missing required fields" 
      }, { status: 400 });
    }

    // Connect to database
    await connectToDB();

    // Check if room_id already exists
    const existingRoom = await Room.findOne({ room_id });
    if (existingRoom) {
      return NextResponse.json({ 
        message: "Room ID already exists" 
      }, { status: 409 });
    }

    // Create new room
    const newRoom = await Room.create({
      room_id,
      name,
      location,
      capacity: Number(capacity),
      features: features || [],
      description: description || "",
      isActive: isActive !== undefined ? isActive : true,
      schedules
    });

    return NextResponse.json({ 
      message: "Room created successfully",
      room: {
        id: newRoom._id,
        room_id: newRoom.room_id,
        name: newRoom.name,
        location: newRoom.location,
        capacity: newRoom.capacity,
        isActive: newRoom.isActive,
        features: newRoom.features,
        description: newRoom.description,
        schedules: newRoom.schedules,
        createdAt: newRoom.createdAt,
        updatedAt: newRoom.updatedAt
      }
    }, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating room:", error);
    
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
      message: "Error creating room",
      error: errorMessage
    }, { status: 500 });
  }
}

// PUT: Update a room
export async function PUT(request: Request) {
  try {
    // Get role from cookies
    const cookieStore = await cookies();
    const role = cookieStore.get("role")?.value;

    // Only admin can update rooms
    if (role !== "admin") {
      return NextResponse.json({ 
        message: "Unauthorized: Admin access required" 
      }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { 
      id, 
      room_id, 
      name, 
      location, 
      capacity, 
      features, 
      description, 
      isActive,
      schedules
    } = body;

    // Validation
    if (!id) {
      return NextResponse.json({ 
        message: "Room ID is required" 
      }, { status: 400 });
    }

    // Connect to database
    await connectToDB();

    // Check if room exists
    const existingRoom = await Room.findById(id);
    if (!existingRoom) {
      return NextResponse.json({ 
        message: "Room not found" 
      }, { status: 404 });
    }

    // If room_id is being changed, check if new room_id already exists
    if (room_id && room_id !== existingRoom.room_id) {
      const roomWithSameId = await Room.findOne({ room_id });
      if (roomWithSameId && !roomWithSameId._id.equals(id)) {
        return NextResponse.json({ 
          message: "Room ID already exists" 
        }, { status: 409 });
      }
    }

    // Update fields
    const updateData: any = {};
    if (room_id) updateData.room_id = room_id;
    if (name) updateData.name = name;
    if (location) updateData.location = location;
    if (capacity !== undefined) updateData.capacity = Number(capacity);
    if (features) updateData.features = features;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (schedules) updateData.schedules = schedules;

    // Update room
    const updatedRoom = await Room.findByIdAndUpdate(
      id, 
      updateData, 
      { new: true, runValidators: true }
    );

    return NextResponse.json({ 
      message: "Room updated successfully",
      room: {
        id: updatedRoom._id,
        room_id: updatedRoom.room_id,
        name: updatedRoom.name,
        location: updatedRoom.location,
        capacity: updatedRoom.capacity,
        isActive: updatedRoom.isActive,
        features: updatedRoom.features,
        description: updatedRoom.description,
        schedules: updatedRoom.schedules,
        updatedAt: updatedRoom.updatedAt
      }
    });
  } catch (error: unknown) {
    console.error("Error updating room:", error);
    
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
      message: "Error updating room",
      error: errorMessage
    }, { status: 500 });
  }
}

// DELETE: Delete a room
export async function DELETE(request: Request) {
  try {
    // Get role from cookies
    const cookieStore = await cookies();
    const role = cookieStore.get("role")?.value;

    // Only admin can delete rooms
    if (role !== "admin") {
      return NextResponse.json({ 
        message: "Unauthorized: Admin access required" 
      }, { status: 403 });
    }

    // Get room ID from query parameters
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ 
        message: "Room ID is required" 
      }, { status: 400 });
    }

    // Connect to database
    await connectToDB();

    // Check if room exists
    const existingRoom = await Room.findById(id);
    if (!existingRoom) {
      return NextResponse.json({ 
        message: "Room not found" 
      }, { status: 404 });
    }

    // Check if room has active schedules
    const hasActiveSchedules = existingRoom.schedules?.length > 0;

    if (hasActiveSchedules) {
      return NextResponse.json({ 
        message: "Cannot delete room with active schedules" 
      }, { status: 400 });
    }

    // Delete room
    await Room.findByIdAndDelete(id);

    return NextResponse.json({ 
      message: "Room deleted successfully",
      room_id: existingRoom.room_id
    });
  } catch (error: unknown) {
    console.error("Error deleting room:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ 
      message: "Error deleting room",
      error: errorMessage
    }, { status: 500 });
  }
}