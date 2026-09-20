import mongoose, { Document, Schema, Types } from "mongoose";

export interface ReviewDocument extends Document {
  userId: Types.ObjectId;
  spaceId: Types.ObjectId;
  rating: number;
  comment: string;
  isFake: boolean;
  confidenceScore: number;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<ReviewDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    spaceId: {
      type: Schema.Types.ObjectId,
      ref: "Space",
      required: true,
      index: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      required: true,
      trim: true
    },
    isFake: {
      type: Boolean,
      default: false
    },
    confidenceScore: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

export default mongoose.model<ReviewDocument>("Review", reviewSchema);
