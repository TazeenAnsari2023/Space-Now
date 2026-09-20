import type {
  CreateSpacePayload,
  Review,
  Space,
  UpdateSpacePayload
} from "../types/space";
import type { Booking, OwnerAnalytics, PaymentOrderResponse } from "../types/booking";
import { API_BASE_URL as BASE_URL } from "./baseUrl";

export interface IndiaCityStat {
  city: string;
  state: string;
  avgPrice: number;
  spaces: number;
  lat: number;
  lng: number;
}

export interface IndiaCityGeo {
  name: string;
  latitude: number;
  longitude: number;
}

export interface IndiaRegionGeo {
  name: string;
  kind: "state" | "union_territory";
  cities: IndiaCityGeo[];
}

export interface NearbySpacesResponse {
  items: Space[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface AppNotification {
  id: string;
  type: "quote" | "tour" | "payment_reminder" | "system";
  title: string;
  message: string;
  spaceId?: string;
  createdAt: string;
  read: boolean;
  actionStatus?: "pending" | "approved" | "rejected";
  actionable?: boolean;
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  useAuth = false
): Promise<T> {
  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (useAuth) {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("Please login to continue");
    }
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers
  });

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  if (!response.ok) {
    const errorData = isJson ? await response.json().catch(() => ({})) : {};
    const textFallback = !isJson ? await response.text().catch(() => "") : "";
    if (response.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      localStorage.removeItem("userId");
      localStorage.removeItem("username");
      localStorage.removeItem("name");
      localStorage.removeItem("email");
    }
    throw new Error(
      errorData.message || textFallback || `Request failed (${response.status})`
    );
  }

  if (!isJson) {
    throw new Error("API returned non-JSON response. Check deployment API route.");
  }

  return response.json() as Promise<T>;
}

export async function fetchNearbySpaces(
  lat: number,
  lng: number,
  options?: {
    radiusKm?: number;
    page?: number;
    limit?: number;
    priceMin?: number;
    priceMax?: number;
    minRating?: number;
    minAvailableSeats?: number;
    bounds?: {
      swLat: number;
      swLng: number;
      neLat: number;
      neLng: number;
    };
  }
): Promise<NearbySpacesResponse> {
  const radiusKm = options?.radiusKm ?? 0;
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 50;
  const priceMinQuery =
    options?.priceMin !== undefined ? `&priceMin=${options.priceMin}` : "";
  const priceMaxQuery =
    options?.priceMax !== undefined ? `&priceMax=${options.priceMax}` : "";
  const minRatingQuery =
    options?.minRating !== undefined ? `&minRating=${options.minRating}` : "";
  const minSeatsQuery =
    options?.minAvailableSeats !== undefined
      ? `&minAvailableSeats=${options.minAvailableSeats}`
      : "";
  const boundsQuery = options?.bounds
    ? `&swLat=${options.bounds.swLat}&swLng=${options.bounds.swLng}&neLat=${options.bounds.neLat}&neLng=${options.bounds.neLng}`
    : "";

  return apiRequest<NearbySpacesResponse>(
    `/spaces/nearby?lat=${lat}&lng=${lng}&radiusKm=${radiusKm}&page=${page}&limit=${limit}${priceMinQuery}${priceMaxQuery}${minRatingQuery}${minSeatsQuery}${boundsQuery}`
  );
}

export async function fetchIndiaCityStats(): Promise<IndiaCityStat[]> {
  return apiRequest<IndiaCityStat[]>("/spaces/cities/india");
}

export async function fetchIndiaRegionsGeo(): Promise<IndiaRegionGeo[]> {
  return apiRequest<IndiaRegionGeo[]>("/spaces/geo/india");
}

export async function fetchSpaceById(id: string): Promise<Space> {
  return apiRequest<Space>(`/spaces/${id}`);
}

export async function fetchOwnerSpaces(): Promise<Space[]> {
  return apiRequest<Space[]>("/spaces/owner/me", {}, true);
}

export async function fetchMyNotifications(): Promise<AppNotification[]> {
  return apiRequest<AppNotification[]>("/notifications/me", {}, true);
}

export async function markNotificationRead(notificationId: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(
    `/notifications/${notificationId}/read`,
    {
      method: "PATCH"
    },
    true
  );
}

export async function respondToNotification(
  notificationId: string,
  decision: "approved" | "rejected"
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(
    `/notifications/${notificationId}/respond`,
    {
      method: "PATCH",
      body: JSON.stringify({ decision })
    },
    true
  );
}

export async function createSpaceLead(payload: {
  spaceId: string;
  action: "quote" | "tour";
}): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(
    `/notifications/spaces/${payload.spaceId}/lead`,
    {
      method: "POST",
      body: JSON.stringify({ action: payload.action })
    },
    true
  );
}

export async function createBooking(payload: {
  spaceId: string;
  date: string;
  seatsBooked: number;
  plan: "coworking-space" | "private-office" | "virtual-office" | "serviced-office";
}): Promise<PaymentOrderResponse> {
  return apiRequest<PaymentOrderResponse>(
    `/bookings/spaces/${payload.spaceId}`,
    {
      method: "POST",
      body: JSON.stringify({
        date: payload.date,
        seatsBooked: payload.seatsBooked,
        plan: payload.plan
      })
    },
    true
  );
}

export async function verifyBookingPayment(payload: {
  bookingId: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
}): Promise<{ message: string; booking: Booking }> {
  return apiRequest<{ message: string; booking: Booking }>(
    "/bookings/verify-payment",
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    true
  );
}

export async function fetchMyBookings(): Promise<Booking[]> {
  return apiRequest<Booking[]>("/bookings/me", {}, true);
}

export async function fetchOwnerBookings(): Promise<Booking[]> {
  return apiRequest<Booking[]>("/bookings/owner/me", {}, true);
}

export async function cancelBooking(bookingId: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(
    `/bookings/${bookingId}/cancel`,
    {
      method: "PATCH"
    },
    true
  );
}

export async function fetchOwnerAnalytics(): Promise<OwnerAnalytics> {
  return apiRequest<OwnerAnalytics>("/bookings/owner/analytics", {}, true);
}

export async function geocodeSpaceAddress(payload: {
  address: string;
  city: string;
  state: string;
}): Promise<{ latitude: number; longitude: number }> {
  return apiRequest<{ latitude: number; longitude: number }>(
    "/spaces/geocode",
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    true
  );
}

export async function uploadSpacePhotos(files: File[]): Promise<string[]> {
  if (!files.length) {
    return [];
  }

  const formData = new FormData();
  files.forEach((file) => formData.append("photos", file));

  const response = await apiRequest<{ urls: string[] }>(
    "/spaces/upload-photo",
    {
      method: "POST",
      body: formData
    },
    true
  );

  return response.urls || [];
}

export async function createSpace(payload: CreateSpacePayload): Promise<Space> {
  return apiRequest<Space>(
    "/spaces",
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    true
  );
}

export async function updateOwnerSpace(id: string, payload: UpdateSpacePayload): Promise<Space> {
  return apiRequest<Space>(
    `/spaces/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(payload)
    },
    true
  );
}

export async function deleteOwnerSpace(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(
    `/spaces/${id}`,
    {
      method: "DELETE"
    },
    true
  );
}

export async function fetchReviews(spaceId: string): Promise<Review[]> {
  const reviews = await apiRequest<any[]>(`/reviews/${spaceId}`);

  return reviews.map((review) => ({
    ...review,
    confidence: review.confidenceScore
  })) as Review[];
}

export async function createReview(payload: {
  spaceId: string;
  rating: number;
  comment: string;
}): Promise<Review> {
  const review = await apiRequest<any>(
    "/reviews",
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    true
  );

  return {
    ...review,
    confidence: review.confidenceScore
  } as Review;
}
