export function isAuthenticated(): boolean {
  return Boolean(localStorage.getItem("token"));
}

export function getUserRole(): "user" | "owner" | "admin" | null {
  return localStorage.getItem("role") as "user" | "owner" | "admin" | null;
}

export function getCurrentAuthScope(): string {
  const userId = localStorage.getItem("userId")?.trim();
  if (userId) {
    return `user:${userId}`;
  }

  const username = localStorage.getItem("username")?.trim().toLowerCase();
  if (username) {
    return `username:${username}`;
  }

  const email = localStorage.getItem("email")?.trim().toLowerCase();
  if (email) {
    return `email:${email}`;
  }

  return "anonymous";
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  localStorage.removeItem("userId");
  localStorage.removeItem("username");
  localStorage.removeItem("name");
  localStorage.removeItem("email");
}
