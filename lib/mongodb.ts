import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "";

if (!MONGODB_URI) {
  throw new Error("Missing MONGODB_URI in .env");
}

export async function connectToDB() {
  try {
    await mongoose.connect(MONGODB_URI, {
      dbName: "room_booking_system", 
    });
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Error connecting to database:", error);
    throw error; // Re-throw to allow handling by caller
  }
}