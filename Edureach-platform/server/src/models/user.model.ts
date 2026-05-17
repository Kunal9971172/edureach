import mongoose, { Schema } from "mongoose";
import type { Document } from "mongoose";

export interface IUser extends Document {
    name: string;
    email: string;
    password: string;
    phone: string;
    role: "admin" | "user";
    callStatus: "Pending" | "Done";
    priority: number;
    messages: { role: string; content: string; timestamp: Date }[];
    chatSummary: string;
    created_at: Date;
}

const UserSchema: Schema<IUser> = new Schema({
    name: {
        type: String,
        required: [true, "Name is required"],
        trim: true,
        minlength: [2, "Name must be at least 2 characters"],
        maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
        type: String,
        required: [true, "Email is required"],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please provide a valid email address"],
    },
    password: {
        type: String,
        required: [true, "Password is required"],
        minlength: [6, "Password must be at least 6 characters"],
    },
    phone: {
        type: String,
        required: [true, "Phone number is required"],
        trim: true,
    },
    role: {
        type: String,
        enum: ["admin", "user"],
        default: "user",
    },
    callStatus: {
        type: String,
        enum: ["Pending", "Done"],
        default: "Pending",
    },
    priority: {
        type: Number,
        default: 1,
        min: 1,
        max: 5,
    },
    messages: [{
        role: { type: String, enum: ["user", "bot"] },
        content: String,
        timestamp: { type: Date, default: Date.now }
    }],
    chatSummary: {
        type: String,
        default: "",
    },
    created_at: {
        type: Date,
        default: Date.now,
    },
});

const User = mongoose.model<IUser>("User", UserSchema);
export default User;