import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    
    // Clear all authentication cookies
    cookieStore.delete("role");
    cookieStore.delete("userId");
    
    // Return success message
    return NextResponse.json({ 
      message: "Logged out successfully" 
    });
  } catch (error) {
    console.error("Logout error:", error);
    
    return NextResponse.json({ 
      message: "Error during logout" 
    }, { status: 500 });
  }
}

export async function GET(req: Request) {
  return POST(req);
}