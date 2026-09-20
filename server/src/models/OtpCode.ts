import mongoose, { Document, Schema } from "mongoose";

export type OtpPurpose = "signup" | "forgot_password";

export interface OtpCodeDocument extends Document {
  email: string;
  purpose: OtpPurpose;
  code: string;
  expiresAt: Date;
  consumed: boolean;
}

const otpCodeSchema = new Schema<OtpCodeDocument>(
  {
    email: { type: String, required: true, index: true },
    purpose: {
      type: String,
      enum: ["signup", "forgot_password"],
      required: true,
      index: true
    },
    code: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    consumed: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export default mongoose.model<OtpCodeDocument>("OtpCode", otpCodeSchema);
