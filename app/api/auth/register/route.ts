import { connectToDB } from "@/lib/mongodb";
import User from "@/lib/models/User";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

// Define an interface for MongoDB validation errors
interface MongoError {
  name: string;
  errors?: {
    [key: string]: {
      message: string;
    };
  };
  message: string;
}

export async function POST(req: Request) {
  try {
    // Parse and validate request body
    const { username, email, password, phone, role = "staff" } = await req.json();
    
    // Check for required fields
    if (!username || !email || !password) {
      return NextResponse.json({ 
        message: "Missing required fields" 
      }, { status: 400 });
    }
    
    // Validate email format
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ 
        message: "Invalid email format" 
      }, { status: 400 });
    }

    // Validate password strength
    if (password.length < 6) {
      return NextResponse.json({ 
        message: "Password must be at least 6 characters" 
      }, { status: 400 });
    }
    
    // Connect to database
    await connectToDB();

    // Check for existing user with the same username or email
    const existingUser = await User.findOne({ 
      $or: [{ username }, { email }] 
    });
    
    if (existingUser) {
      if (existingUser.username === username) {
        return NextResponse.json({ 
          message: "Username already exists" 
        }, { status: 409 });
      }
      if (existingUser.email === email) {
        return NextResponse.json({ 
          message: "Email already registered" 
        }, { status: 409 });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new user
    const newUser = await User.create({ 
      username, 
      email, 
      password: hashedPassword, 
      phone, 
      role,
      isActive: true,
      lastLogin: null
    });

    return NextResponse.json({ 
      message: "User registered successfully",
      user: {
        username: newUser.username,
        email: newUser.email,
        role: newUser.role
      }
    }, { status: 201 });
  } catch (err: unknown) {
    console.error("Registration error:", err);
    
    // Type guard to check if it's a MongoDB validation error
    const isMongoError = (error: unknown): error is MongoError => {
      return typeof error === 'object' && 
             error !== null && 
             'name' in error && 
             typeof (error as any).name === 'string';
    };
    
    if (isMongoError(err) && err.name === 'ValidationError' && err.errors) {
      const validationErrors = Object.values(err.errors).map(error => error.message);
      return NextResponse.json({ 
        message: "Validation failed", 
        errors: validationErrors 
      }, { status: 400 });
    }
    
    // For any other error
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    return NextResponse.json({ 
      message: "Error registering user",
      error: errorMessage
    }, { status: 500 });
  }
}