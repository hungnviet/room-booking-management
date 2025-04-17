import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const role = cookieStore.get("role")?.value;

    // If no role cookie found, user is not logged in
    if (!role) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Validate that role is one of the expected values
    if (role !== "admin" && role !== "staff" && role !== "student") {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // User is authenticated, return their role
    return NextResponse.json({ 
      authenticated: true, 
      role: role 
    });
  } catch (error) {
    console.error("Auth check error:", error);
    return NextResponse.json(
      { message: "Authentication check failed" },
      { status: 500 }
    );
  }
}