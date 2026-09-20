import { API_BASE_URL as BASE_URL } from "./baseUrl";

export interface AdminStats {
  totalUsers: number;
  totalOwners: number;
  verifiedOwners: number;
  pendingOwners: number;
  totalSpaces: number;
  verifiedSpaces: number;
  pendingSpaces: number;
  rejectedSpaces: number;
  totalReviews: number;
  fakeReviews: number;
}

export interface AdminSpace {
  _id: string;
  name: string;
  city?: string;
  state?: string;
  address?: string;
  verificationStatus?: "pending" | "verified" | "rejected";
  verificationScore?: number;
  verificationNotes?: string;
  createdAt?: string;
  ownerId?: string;
}

export interface AdminReview {
  _id: string;
  rating: number;
  comment: string;
  isFake: boolean;
  confidenceScore: number;
  createdAt: string;
  userId?: { _id: string; name?: string; username?: string } | string;
  spaceId?: { _id: string; name?: string; city?: string; state?: string } | string;
}

export interface AdminOwner {
  _id: string;
  name: string;
  email: string;
  username: string;
  city: string;
  state: string;
  officeAddress?: string;
  officeNumber?: string;
  ownerVerificationStatus?: "pending" | "verified" | "rejected";
  createdAt?: string;
}

async function adminRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error("Please login first");
  }

  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${token}`);

  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  if (!response.ok) {
    const data = isJson ? await response.json().catch(() => ({})) : {};
    const textFallback = !isJson ? await response.text().catch(() => "") : "";
    if (response.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      localStorage.removeItem("userId");
      localStorage.removeItem("username");
      localStorage.removeItem("name");
      localStorage.removeItem("email");
    }
    throw new Error(data.message || textFallback || `Request failed (${response.status})`);
  }

  if (!isJson) {
    throw new Error("API returned non-JSON response. Check deployment API route.");
  }

  return response.json() as Promise<T>;
}

export function fetchAdminStats() {
  return adminRequest<AdminStats>("/admin/stats");
}

export function fetchAdminSpaces(status: "all" | "verified" | "pending" | "rejected" = "all") {
  return adminRequest<AdminSpace[]>(`/admin/spaces?status=${status}`);
}

export function moderateAdminSpace(
  spaceId: string,
  decision: "verified" | "pending" | "rejected",
  notes?: string
) {
  return adminRequest<AdminSpace>(`/admin/spaces/${spaceId}/verify`, {
    method: "PATCH",
    body: JSON.stringify({ decision, notes })
  });
}

export function deleteAdminSpace(spaceId: string) {
  return adminRequest<{ message: string }>(`/admin/spaces/${spaceId}`, {
    method: "DELETE"
  });
}

export function fetchAdminReviews(fakeOnly = false) {
  return adminRequest<AdminReview[]>(`/admin/reviews?fakeOnly=${fakeOnly}`);
}

export function deleteAdminReview(reviewId: string) {
  return adminRequest<{ message: string }>(`/admin/reviews/${reviewId}`, {
    method: "DELETE"
  });
}

export function fetchAdminOwners(status: "all" | "verified" | "pending" | "rejected" = "pending") {
  return adminRequest<AdminOwner[]>(`/admin/owners?status=${status}`);
}

export function moderateAdminOwner(
  ownerId: string,
  decision: "verified" | "pending" | "rejected"
) {
  return adminRequest<AdminOwner>(`/admin/owners/${ownerId}/verify`, {
    method: "PATCH",
    body: JSON.stringify({ decision })
  });
}
