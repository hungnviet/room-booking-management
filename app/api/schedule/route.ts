import { connectToDB } from "@/lib/mongodb";
import Room from "@/lib/models/Room";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import mongoose from "mongoose";

// GET: Fetch schedules for the authenticated staff member
export async function GET(request: Request) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const roomId = searchParams.get("roomId");
    const includeRoomDetails = searchParams.get("includeRoomDetails") === "true";
    
    // Get user ID from cookies for authentication
    const cookieStore = await cookies();
    const userId = cookieStore.get("userId")?.value;
    const role = cookieStore.get("role")?.value;
    
    if (!userId) {
      return NextResponse.json({ 
        message: "Unauthorized: Please log in" 
      }, { status: 401 });
    }
    
    // Connect to database
    await connectToDB();
    
    // Build query
    const query: Record<string, any> = {};
    
    // Admin can see all schedules if specified, otherwise only their own
    if (role !== "admin" || searchParams.get("onlyMine") === "true") {
      query["schedules.user_id"] = new mongoose.Types.ObjectId(userId);
    }
    
    // Add date range filter if provided
    if (startDate) {
      query["schedules.date"] = query["schedules.date"] || {};
      query["schedules.date"].$gte = new Date(startDate);
    }
    
    if (endDate) {
      query["schedules.date"] = query["schedules.date"] || {};
      query["schedules.date"].$lte = new Date(endDate);
    }
    
    // Add room filter if provided
    if (roomId) {
      query.room_id = roomId;
    }
    
    // Build projection to include needed fields
    // Use Record<string, any> type to avoid TypeScript errors when modifying the object
    const projection: Record<string, any> = {
      room_id: 1,
      name: 1,
      schedules: {
        $filter: {
          input: "$schedules",
          as: "schedule",
          cond: {}
        }
      }
    };
    
    // Conditionally add location field instead of deleting it later
    if (includeRoomDetails) {
      projection.location = 1;
    }
    
    // Add conditions to the $filter for schedules
    let filterCond: Record<string, any> = {};
    
    // Filter by user ID if needed
    if (role !== "admin" || searchParams.get("onlyMine") === "true") {
      filterCond["$eq"] = ["$$schedule.user_id", new mongoose.Types.ObjectId(userId)];
    }
    
    // Add date range condition if provided
    if (startDate || endDate) {
      const dateConditions = [];
      
      if (startDate) {
        dateConditions.push({ 
          $gte: ["$$schedule.date", new Date(startDate)] 
        });
      }
      
      if (endDate) {
        dateConditions.push({ 
          $lte: ["$$schedule.date", new Date(endDate)] 
        });
      }
      
      if (dateConditions.length > 0) {
        if (filterCond["$eq"]) {
          // If we already have a user filter, need to combine with AND
          filterCond = {
            $and: [
              filterCond,
              { $and: dateConditions }
            ]
          };
        } else {
          // Otherwise just use the date conditions
          filterCond = { $and: dateConditions };
        }
      }
    }
    
    // Set the filter condition
    if (Object.keys(filterCond).length > 0) {
      projection.schedules.$filter.cond = filterCond;
    }
    
    // Query for rooms with matching schedules
    const rooms = await Room.aggregate([
      { $match: query },
      { $project: projection },
      // Only return rooms that have matching schedules
      { $match: { "schedules.0": { $exists: true } } }
    ]);
    
    // Transform the result
    const schedules = rooms.flatMap(room => {
      return room.schedules.map((schedule: any) => ({
        id: schedule._id,
        date: schedule.date,
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        note: schedule.note,
        room: {
          id: room._id,
          room_id: room.room_id,
          name: room.name,
          ...(includeRoomDetails && room.location ? { location: room.location } : {})
        },
        createdAt: schedule.createdAt,
        updatedAt: schedule.updatedAt
      }));
    });
    
    // Sort schedules by date and time
    schedules.sort((a: any, b: any) => {
      // First sort by date
      const dateComparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateComparison !== 0) return dateComparison;
      
      // If dates are the same, sort by start time
      return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
    });
    
    return NextResponse.json({ 
      schedules,
      count: schedules.length
    });
  } catch (error: unknown) {
    console.error("Error fetching schedules:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ 
      message: "Error fetching schedules",
      error: errorMessage
    }, { status: 500 });
  }
}

// POST: Create a new schedule (typically handled through room APIs)
export async function POST(request: Request) {
  return NextResponse.json({ 
    message: "Schedule creation is handled through the room API" 
  }, { status: 400 });
}