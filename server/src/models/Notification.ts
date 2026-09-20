import mongoose, { Document, Schema, Types } from "mongoose";

export interface NotificationDocument extends Document {
  recipientUserId: Types.ObjectId;
  actorUserId?: Types.ObjectId;
  spaceId?: Types.ObjectId;
  type: "quote" | "tour" | "payment_reminder" | "system";
  title: string;
  message: string;
  read: boolean;
  actionStatus?: "pending" | "approved" | "rejected";
  createdAt?: Date;
  updatedAt?: Date;
}

const notificationSchema = new Schema<NotificationDocument>(
  {
    recipientUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    actorUserId: {
      type: Schema.Types.ObjectId,
      ref: "User"
    },
    spaceId: {
      type: Schema.Types.ObjectId,
      ref: "Space"
    },
    type: {
      type: String,
      enum: ["quote", "tour", "payment_reminder", "system"],
      required: true
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    read: { type: Boolean, default: false },
    actionStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"]
    }
  },
  { timestamps: true }
);

export default mongoose.model<NotificationDocument>("Notification", notificationSchema);
