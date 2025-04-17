import { connectToDB } from "@/lib/mongodb";
import Room from "@/lib/models/Room";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// Sample room data with empty schedules array
const sampleRooms = [
  {
    room_id: "A101",
    name: "Conference Room Alpha",
    location: "Block A, 1st Floor",
    capacity: 20,
    features: ["Projector", "Whiteboard", "Video conferencing"],
    description: "Large conference room ideal for meetings and presentations.",
    schedules: []
  },
  {
    room_id: "A102",
    name: "Study Room 1",
    location: "Block A, 1st Floor",
    capacity: 8,
    features: ["Whiteboard", "Wi-Fi"],
    description: "Small study room for group work.",
    schedules: []
  },
  {
    room_id: "B201",
    name: "Lecture Hall 1",
    location: "Block B, 2nd Floor",
    capacity: 100,
    features: ["Projector", "Microphone", "Podium", "Speakers"],
    description: "Large lecture hall for classes and events.",
    schedules: []
  },
  {
    room_id: "B202",
    name: "Computer Lab",
    location: "Block B, 2nd Floor",
    capacity: 30,
    features: ["Computers", "Printer", "Projector"],
    description: "Computer lab with 30 workstations.",
    schedules: []
  },
  {
    room_id: "C301",
    name: "Workshop Space",
    location: "Block C, 3rd Floor",
    capacity: 25,
    features: ["Workbenches", "Tools", "Sink"],
    description: "Workshop space for hands-on projects.",
    schedules: []
  },
  {
    room_id: "C302",
    name: "Seminar Room",
    location: "Block C, 3rd Floor",
    capacity: 15,
    features: ["Round table", "Whiteboard", "TV Screen"],
    description: "Seminar room for small group discussions.",
    schedules: []
  },
  {
    room_id: "D101",
    name: "Meeting Room 1",
    location: "Block D, 1st Floor",
    capacity: 10,
    features: ["TV Screen", "Whiteboard", "Conferencing phone"],
    description: "Medium-sized meeting room for team meetings.",
    schedules: []
  },
  {
    room_id: "D102",
    name: "Meeting Room 2",
    location: "Block D, 1st Floor",
    capacity: 6,
    features: ["Whiteboard", "TV Screen"],
    description: "Small meeting room for quick huddles.",
    schedules: []
  },
  {
    room_id: "E201",
    name: "Auditorium",
    location: "Block E, 2nd Floor",
    capacity: 200,
    features: ["Stage", "Projector", "Sound system", "Microphones"],
    description: "Large auditorium for presentations and events.",
    schedules: []
  },
  {
    room_id: "E202",
    name: "Quiet Study Area",
    location: "Block E, 2nd Floor",
    capacity: 40,
    features: ["Individual desks", "Reading lamps", "Power outlets"],
    description: "Quiet area for individual study.",
    schedules: []
  }
];

export async function GET(request: Request) {
  try {
    // Check for admin access
    const cookieStore = await cookies();
    const role = cookieStore.get("role")?.value;

    if (role !== "admin") {
      return NextResponse.json({ 
        message: "Unauthorized: Admin access required" 
      }, { status: 403 });
    }

    // Connect to database
    await connectToDB();

    // Check if parameter to force overwrite is provided
    const { searchParams } = new URL(request.url);
    const forceOverwrite = searchParams.get("force") === "true";

    const results = [];
    
    // Check if rooms already exist
    const existingCount = await Room.countDocuments();
    
    if (existingCount > 0 && !forceOverwrite) {
      return NextResponse.json({ 
        message: `${existingCount} rooms already exist in the database. Use ?force=true to overwrite.`,
        existingCount
      }, { status: 200 });
    }
    
    // If force parameter is true, clear existing rooms
    if (forceOverwrite) {
      await Room.deleteMany({});
      results.push({ action: "deleted", count: existingCount, message: "Deleted existing rooms" });
    }

    // Insert sample rooms with empty schedules
    const createdRooms = await Room.insertMany(sampleRooms);
    
    results.push({ 
      action: "created", 
      count: createdRooms.length,
      message: `Created ${createdRooms.length} sample rooms with empty schedules` 
    });

    return NextResponse.json({ 
      message: "Room seeding completed successfully",
      results,
      rooms: createdRooms.map(room => ({
        id: room._id,
        room_id: room.room_id,
        name: room.name,
        location: room.location,
        capacity: room.capacity,
        features: room.features,
        schedules_count: room.schedules.length(),
      }))
    }, { status: 200 });
  } catch (error) {
    console.error("Room seeding error:", error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ 
      message: "Error seeding rooms",
      error: errorMessage
    }, { status: 500 });
  }
}