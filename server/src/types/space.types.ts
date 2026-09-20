export interface Location {
  type: "Point";
  coordinates: [number, number]; // [lng, lat]
}

export interface Amenities {
  wifi: boolean;
  ac: boolean;
  parking: boolean;
}

export interface Review {
  comment: string;
  rating: number;
  isFake?: boolean;
  confidence?: number;
}

export interface Space {
  name: string;
  pricePerMonth: number;
  availableSeats: number;
  location: Location;
  amenities: Amenities;
  ownerId?: string;
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
}
