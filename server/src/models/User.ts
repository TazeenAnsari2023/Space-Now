import mongoose, { Schema, Document } from "mongoose";

export interface UserDocument extends Document {
  name: string;
  email: string;
  username: string;
  mobile: string;
  city: string;
  state: string;
  password: string;
  role: "user" | "owner" | "admin";
  emailVerified: boolean;
  gender?: "male" | "female" | "other" | "prefer_not_to_say";
  dob?: Date;
  bio?: string;
  addressLine?: string;
  country?: string;
  postalCode?: string;
  officeAddress?: string;
  officeNumber?: string;
  ownerVerificationStatus?: "pending" | "verified" | "rejected";
}

const userSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    mobile: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["user", "owner", "admin"],
      default: "user"
    },
    emailVerified: { type: Boolean, default: false },
    gender: {
      type: String,
      enum: ["male", "female", "other", "prefer_not_to_say"]
    },
    dob: { type: Date },
    bio: { type: String, trim: true },
    addressLine: { type: String, trim: true },
    country: { type: String, trim: true },
    postalCode: { type: String, trim: true },
    officeAddress: { type: String },
    officeNumber: { type: String },
    ownerVerificationStatus: {
      type: String,
      enum: ["pending", "verified", "rejected"]
    }
  },
  { timestamps: true }
);

export default mongoose.model<UserDocument>("User", userSchema);
