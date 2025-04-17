import mongoose from "mongoose";

// Define the booking schema as a sub-document
const ScheduleSchema = new mongoose.Schema({
  date:{
    type: Date,
    required: [true, "Date is required"],
  },
  start_time: {
    type: Date,
    required: [true, "Start time is required"]
  },
  end_time: {
    type: Date,
    required: [true, "End time is required"]
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, "User ID is required"]
  },
  note: {
    type: String,
    trim: true
  },
  
}, { timestamps: true });

// Add validation to ensure end_time is after start_time
ScheduleSchema.pre('validate', function(next) {
  if (this.start_time && this.end_time && this.start_time >= this.end_time) {
    this.invalidate('end_time', 'End time must be after start time');
  }
  next();
});

const RoomSchema = new mongoose.Schema(
  {
    room_id: { 
      type: String, 
      required: [true, "Room ID is required"],
      unique: true,
      trim: true
    },
    name: { 
      type: String, 
      required: [true, "Room name is required"],
      trim: true,
      maxlength: [100, "Room name must be less than 100 characters"]
    },
    location: { 
      type: String, 
      required: [true, "Location is required"],
      trim: true
    },
    capacity: { 
      type: Number, 
      required: [true, "Capacity is required"],
      min: [1, "Capacity must be at least 1"]
    },
    isActive: {
      type: Boolean,
      default: true
    },
    features: {
      type: [String],
      default: []
    },
    description: {
      type: String,
      trim: true
    },
    schedules: [ScheduleSchema]
  },
  { timestamps: true }
);

// Add indexes for better query performance
RoomSchema.index({ room_id: 1 });
RoomSchema.index({ location: 1 });
RoomSchema.index({ "schedules.date": 1 });
RoomSchema.index({ "bookings.start_time": 1, "bookings.end_time": 1 });
RoomSchema.index({ "bookings.user_id": 1 });

// Skip duplicate model compilation error in development
const Room = mongoose.models.Room || mongoose.model("Room", RoomSchema);

export default Room;