import { connectToDB } from "@/lib/mongodb";
import User from "@/lib/models/User";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

interface AccountSeed {
  username: string;
  email: string;
  password: string;
}

export async function GET() {
  try {
    // Connect to database
    await connectToDB();

    // Define admin accounts to seed
    // const adminAccounts: AccountSeed[] = [
    //   {
    //     username: "admin1",
    //     email: "admin1@example.com",
    //     password: "passAdmin1",
    //   },
    //   {
    //     username: "admin2",
    //     email: "admin2@example.com",
    //     password: "passAdmin2",
    //   },
    //   {
    //     username: "admin3",
    //     email: "admin3@example.com",
    //     password: "passAdmin3",
    //   },
    // ];

    // const staffAccounts: AccountSeed[] = [
    //   {
    //     username: "staff1",
    //     email: "staff1@example.com",
    //     password: "passStaff1",
    //   },
    //   {
    //     username: "staff2",
    //     email: "staff2@example.com",
    //     password: "passStaff2",
    //   }
    // ]    

    const studetnAccount: AccountSeed[] = [
      {
        username: "student1",
        email: "student1@example.com",
        password: "passStudent1",
      },
      {
        username: "student2",
        email: "student2@example.com",
        password: "passStudent2",
      }
    ]    
    const results = [];

    // Create admin accounts
    for (const account of studetnAccount) {
      // Check if username already exists
      const existingUser = await User.findOne({ username: account.username });
      
      if (existingUser) {
        results.push({
          username: account.username,
          status: "skipped",
          message: "User already exists"
        });
        continue;
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(account.password, 10);
      
      // Create new admin user
      const newAdmin = await User.create({
        username: account.username,
        email: account.email,
        password: hashedPassword,
        role: "staff",
        isActive: true,
        phone: "",
        lastLogin: null
      });
      
      results.push({
        username: newAdmin.username,
        email: newAdmin.email,
        status: "created",
        message: "Admin account created successfully"
      });
    }

    return NextResponse.json({ 
      message: "Admin seeding completed",
      results
    }, { status: 200 });
  } catch (error) {
    console.error("Admin seeding error:", error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ 
      message: "Error seeding admin accounts",
      error: errorMessage
    }, { status: 500 });
  }
}