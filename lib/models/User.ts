import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    username: { 
      type: String, 
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [50, "Username must be less than 50 characters"]
    },
    email: { 
      type: String, 
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please use a valid email address"]
    },
    password: { 
      type: String, 
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"]
    },
    phone: { 
      type: String,
      trim: true 
    },
    role: { 
      type: String, 
      enum: ["admin", "staff", "student"], 
      default: "staff" 
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastLogin: {
      type: Date
    }
  },
  { timestamps: true }
);

// Skip duplicate model compilation error in development
const User = mongoose.models.User || mongoose.model("User", UserSchema);

export default User;