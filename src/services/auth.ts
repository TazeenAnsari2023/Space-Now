import { API_BASE_URL } from "./baseUrl";

const BASE_URL = `${API_BASE_URL}/auth`;

export interface MyProfile {
  _id?: string;
  name: string;
  email: string;
  username: string;
  mobile: string;
  city: string;
  state: string;
  role: "user" | "owner" | "admin";
  gender?: "male" | "female" | "other" | "prefer_not_to_say";
  dob?: string;
  bio?: string;
  addressLine?: string;
  country?: string;
  postalCode?: string;
  officeAddress?: string;
  officeNumber?: string;
}

export interface UpdateProfilePayload {
  name?: string;
  username?: string;
  mobile?: string;
  city?: string;
  state?: string;
  gender?: "male" | "female" | "other" | "prefer_not_to_say" | "";
  dob?: string;
  bio?: string;
  addressLine?: string;
  country?: string;
  postalCode?: string;
  officeAddress?: string;
  officeNumber?: string;
}

async function parseResponse(res: Response) {
  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await res.json().catch(() => ({})) : {};

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      localStorage.removeItem("userId");
      localStorage.removeItem("username");
      localStorage.removeItem("name");
      localStorage.removeItem("email");
    }
    const fallback = res.statusText || `HTTP ${res.status}`;
    throw new Error((data as { message?: string }).message || fallback || "Request failed");
  }

  return data;
}

async function safeFetch(input: RequestInfo | URL, init?: RequestInit) {
  try {
    return await fetch(input, init);
  } catch {
    throw new Error("Cannot reach API. Check deployment env vars or local server.");
  }
}

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error("Not authenticated");
  }

  return {
    Authorization: `Bearer ${token}`
  };
}

export async function loginUser(data: { identifier: string; password: string }) {
  const res = await safeFetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  return parseResponse(res);
}

export async function fetchMyProfile(): Promise<MyProfile> {
  const res = await safeFetch(`${BASE_URL}/me`, {
    headers: getAuthHeaders()
  });

  return parseResponse(res);
}

export async function updateMyProfile(data: UpdateProfilePayload) {
  const res = await safeFetch(`${BASE_URL}/me/profile`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders()
    },
    body: JSON.stringify(data)
  });

  return parseResponse(res);
}

export async function updateMySecurity(data: {
  currentPassword?: string;
  newPassword?: string;
  newMobile?: string;
}) {
  const res = await safeFetch(`${BASE_URL}/me/security`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders()
    },
    body: JSON.stringify(data)
  });

  return parseResponse(res);
}

export async function sendSignupOtp(data: { email: string }) {
  const res = await safeFetch(`${BASE_URL}/send-signup-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  return parseResponse(res);
}

export async function verifySignupOtp(data: { email: string; otp: string }) {
  const res = await safeFetch(`${BASE_URL}/verify-signup-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  return parseResponse(res);
}

export async function checkUsername(data: { username: string }) {
  const res = await safeFetch(`${BASE_URL}/check-username`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  return parseResponse(res);
}

export async function registerUser(data: {
  signupToken: string;
  name: string;
  email: string;
  role: "user" | "owner";
  username: string;
  mobile: string;
  city: string;
  state: string;
  password: string;
  officeAddress?: string;
  officeNumber?: string;
}) {
  const res = await safeFetch(`${BASE_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  return parseResponse(res);
}

export async function requestForgotPasswordOtp(data: { identifier: string }) {
  const res = await safeFetch(`${BASE_URL}/forgot-password/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  return parseResponse(res);
}

export async function verifyForgotPasswordOtp(data: { identifier: string; otp: string }) {
  const res = await safeFetch(`${BASE_URL}/forgot-password/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  return parseResponse(res);
}

export async function resetPassword(data: { resetToken: string; newPassword: string }) {
  const res = await safeFetch(`${BASE_URL}/forgot-password/reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  return parseResponse(res);
}
