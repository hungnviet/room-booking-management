import mongoose from "mongoose";

// Define the status enum values
enum BookingStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED"
}

const BookingSchema = new mongoose.Schema(
  {
    booking_id: {
      type: String,
      required: [true, "Booking ID is required"],
      unique: true,
      trim: true
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, "User ID is required"]
    },
    room_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: [true, "Room ID is required"]
    },
    booking_date: {
      type: Date,
      required: [true, "Booking date is required"]
    },
    start_time: {
      type: Date,
      required: [true, "Start time is required"]
    },
    end_time: {
      type: Date, 
      required: [true, "End time is required"]
    },
    note: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: {
        values: Object.values(BookingStatus),
        message: "Status must be one of: PENDING, ACCEPTED, REJECTED"
      },
      default: BookingStatus.PENDING
    }
  },
  { timestamps: true }
);

// Add validation to ensure end_time is after start_time
BookingSchema.pre('validate', function(next) {
  if (this.start_time && this.end_time && this.start_time >= this.end_time) {
    this.invalidate('end_time', 'End time must be after start time');
  }
  next();
});

// Add indexes for better query performance
BookingSchema.index({ booking_id: 1 });
BookingSchema.index({ user_id: 1 });
BookingSchema.index({ room_id: 1 });
BookingSchema.index({ booking_date: 1 });
BookingSchema.index({ start_time: 1, end_time: 1 });
BookingSchema.index({ status: 1 });

// Create or access the Booking model
const Booking = mongoose.models.Booking || mongoose.model("Booking", BookingSchema);

export default Booking;