import type { Space } from "../types/space";
import { getCurrentAuthScope } from "./auth";

const STORAGE_KEY = "favorite_spaces";

function getFavoritesKey() {
  return `${STORAGE_KEY}:${getCurrentAuthScope()}`;
}

/** Get all favorite spaces */
export function getFavorites(): Space[] {
  if (getCurrentAuthScope() === "anonymous") {
    return [];
  }

  const raw = localStorage.getItem(getFavoritesKey());
  return raw ? (JSON.parse(raw) as Space[]) : [];
}

/** Check if space is favorite */
export function isFavorite(spaceId: string): boolean {
  return getFavorites().some(space => space._id === spaceId);
}

/** Add or remove favorite */
export function toggleFavorite(space: Space): Space[] {
  if (getCurrentAuthScope() === "anonymous") {
    throw new Error("Please login first to add favorites.");
  }

  const favorites = getFavorites();
  const exists = favorites.find(f => f._id === space._id);

  let updated: Space[];

  if (exists) {
    updated = favorites.filter(f => f._id !== space._id);
  } else {
    updated = [...favorites, space];
  }

  localStorage.setItem(getFavoritesKey(), JSON.stringify(updated));
  return updated;
}
