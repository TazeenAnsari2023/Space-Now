export interface Location {
  type: "Point";
  coordinates: [number, number]; // [lng, lat]
}

export interface Amenities {
  wifi: boolean;
  ac: boolean;
  parking: boolean;
}

export interface ReviewAuthor {
  _id: string;
  name: string;
}

export interface Review {
  _id?: string;
  userId?: string | ReviewAuthor;
  spaceId?: string;
  comment: string;
  rating: number;
  isFake?: boolean;
  confidence?: number;
  confidenceScore?: number;
  createdAt?: string;
}

export interface Space {
  _id: string;
  name: string;
  description?: string;
  pricePerMonth: number;
  availableSeats: number;
  ownerId?: string;
  location: Location;
  amenities: Amenities;
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
  reviews?: Review[];
  createdAt?: string;
}

export interface CreateSpacePayload {
  name: string;
  pricePerMonth: number;
  availableSeats: number;
  latitude: number;
  longitude: number;
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
  amenities: Amenities;
}

export interface UpdateSpacePayload {
  name?: string;
  pricePerMonth?: number;
  availableSeats?: number;
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
  amenities?: Amenities;
}
