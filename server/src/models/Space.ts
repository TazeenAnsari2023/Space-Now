import mongoose, { Document, Schema, Types } from "mongoose";

interface SpaceDocument extends Document {
  name: string;
  pricePerMonth: number;
  availableSeats: number;
  location: {
    type: "Point";
    coordinates: [number, number];
  };
  amenities: {
    wifi: boolean;
    ac: boolean;
    parking: boolean;
  };
  city?: string;
  state?: string;
  address?: string;
  overview?: string;
  amenityHighlights?: string[];
  photos?: string[];
  pricing?: {
    servicedOffice?: number;
    coworkingSpace?: number;
    privateOffice?: number;
    virtualOffice?: number;
  };
  rating?: number;
  reviewCount?: number;
  ratingBreakdown?: {
    location?: number;
    wifi?: number;
    productivity?: number;
    comfort?: number;
    community?: number;
    amenities?: number;
  };
  ownerId?: Types.ObjectId;
  verificationStatus?: "pending" | "verified" | "rejected";
  verificationSource?: "nominatim";
  verificationScore?: number;
  verifiedAt?: Date;
  verificationNotes?: string;
  reviews?: Array<{
    comment: string;
    rating: number;
    isFake?: boolean;
    confidence?: number;
  }>;
  createdAt?: Date;
  updatedAt?: Date;
}

const spaceSchema = new Schema<SpaceDocument>(
  {
    name: { type: String, required: true },
    pricePerMonth: { type: Number, required: true },
    availableSeats: { type: Number, required: true },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: true
      },
      coordinates: {
        type: [Number],
        required: true
      }
    },
    amenities: {
      wifi: { type: Boolean, default: false },
      ac: { type: Boolean, default: false },
      parking: { type: Boolean, default: false }
    },
    city: { type: String },
    state: { type: String },
    address: { type: String },
    overview: { type: String },
    amenityHighlights: [{ type: String }],
    photos: [{ type: String }],
    pricing: {
      servicedOffice: { type: Number },
      coworkingSpace: { type: Number },
      privateOffice: { type: Number },
      virtualOffice: { type: Number }
    },
    rating: { type: Number },
    reviewCount: { type: Number },
    ratingBreakdown: {
      location: { type: Number },
      wifi: { type: Number },
      productivity: { type: Number },
      comfort: { type: Number },
      community: { type: Number },
      amenities: { type: Number }
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User"
    },
    verificationStatus: {
      type: String,
      enum: ["pending", "verified", "rejected"]
    },
    verificationSource: {
      type: String,
      enum: ["nominatim"]
    },
    verificationScore: { type: Number },
    verifiedAt: { type: Date },
    verificationNotes: { type: String },
    reviews: [
      {
        comment: String,
        rating: Number,
        isFake: Boolean,
        confidence: Number
      }
    ]
  },
  { timestamps: true }
);

spaceSchema.index({ location: "2dsphere" });

export default mongoose.model<SpaceDocument>("Space", spaceSchema);
