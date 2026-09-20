import mongoose, { Document, Schema, Types } from "mongoose";

export interface BookingDocument extends Document {
  userId: Types.ObjectId;
  spaceId: Types.ObjectId;
  plan: "coworking-space" | "private-office" | "virtual-office" | "serviced-office";
  date: Date;
  seatsBooked: number;
  unitPrice: number;
  totalAmount: number;
  status: "pending" | "confirmed" | "cancelled" | "payment_failed";
  paymentGateway?: "razorpay" | "mock";
  paymentOrderId?: string;
  paymentId?: string;
  paymentSignature?: string;
  paymentStatus?: "created" | "paid" | "failed";
  createdAt?: Date;
  updatedAt?: Date;
}

const bookingSchema = new Schema<BookingDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    spaceId: {
      type: Schema.Types.ObjectId,
      ref: "Space",
      required: true,
      index: true
    },
    plan: {
      type: String,
      enum: ["coworking-space", "private-office", "virtual-office", "serviced-office"],
      required: true
    },
    date: {
      type: Date,
      required: true
    },
    seatsBooked: {
      type: Number,
      required: true,
      min: 1
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "payment_failed"],
      default: "pending"
    },
    paymentGateway: {
      type: String,
      enum: ["razorpay", "mock"]
    },
    paymentOrderId: { type: String },
    paymentId: { type: String },
    paymentSignature: { type: String },
    paymentStatus: {
      type: String,
      enum: ["created", "paid", "failed"],
      default: "created"
    }
  },
  { timestamps: true }
);

bookingSchema.index({ userId: 1, spaceId: 1, date: 1 }, { unique: false });

export default mongoose.model<BookingDocument>("Booking", bookingSchema);
