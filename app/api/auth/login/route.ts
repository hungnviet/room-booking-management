import { connectToDB } from "@/lib/mongodb";
import User from "@/lib/models/User";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    // Parse request body
    const { username, password, role } = await req.json();
    
    // Validate input data
    if (!username || !password || !role) {
      return NextResponse.json(
        { message: "Missing required fields" }, 
        { status: 400 }
      );
    }
    
    // Connect to database
    await connectToDB();

    // Find user by username
    const user = await User.findOne({ username });
    if (!user) {
      return NextResponse.json(
        { message: "Invalid credentials" }, 
        { status: 401 }
      );
    }

    // Check if user is active
    if (user.isActive === false) {
      return NextResponse.json(
        { message: "Account is deactivated" }, 
        { status: 403 }
      );
    }

    // Verify password
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json(
        { message: "Invalid credentials" }, 
        { status: 401 }
      );
    }

    // Verify role
    if (user.role !== role) {
      return NextResponse.json(
        { message: "Invalid role selected" }, 
        { status: 403 }
      );
    }

    // Update last login timestamp
    await User.findByIdAndUpdate(user._id, {
      lastLogin: new Date()
    });

    // Set cookies
    const cookieStore = await cookies();
    cookieStore.set("role", user.role, {
      httpOnly: true, // Make cookie HTTP-only for security
      secure: process.env.NODE_ENV === 'production', // Only use HTTPS in production
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
      sameSite: "strict"
    });
    
    // You might want to set a userId cookie as well
    cookieStore.set("userId", user._id.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24,
      path: "/",
      sameSite: "strict"
    });

    // Return success response with minimal user data
    return NextResponse.json({ 
      message: "Login successful", 
      user: {
        role: user.role,
        username: user.username
      }
    });
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json(
      { message: "An error occurred during login" }, 
      { status: 500 }
    );
  }
}