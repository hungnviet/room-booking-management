import { connectToDB } from "@/lib/mongodb";
import User from "@/lib/models/User";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  try {
    // Get role from cookies for permission check
    const cookieStore = await cookies();
    const role = cookieStore.get("role")?.value;

    // Only admin can access all users
    if (role !== "admin") {
      return NextResponse.json({ 
        message: "Unauthorized: Admin access required" 
      }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const role_filter = searchParams.get("role");
    const search = searchParams.get("search");
    const isActive = searchParams.get("isActive");

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};
    
    // Add filters if provided
    if (role_filter) {
      query.role = role_filter;
    }
    
    if (isActive !== null) {
      query.isActive = isActive === 'true';
    }
    
    // Add search if provided
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Connect to database
    await connectToDB();

    // Get users with pagination
    const users = await User.find(query)
      .select('-password') // Exclude password
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const total = await User.countDocuments(query);
    
    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return NextResponse.json({
      users: users.map(user => ({
        id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone || "",
        role: user.role,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage,
        hasPrevPage
      }
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ 
      message: "Error fetching users" 
    }, { status: 500 });
  }
}