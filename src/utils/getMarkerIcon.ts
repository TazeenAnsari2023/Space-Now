import type { Space } from "../types/space";
import type { Icon } from "leaflet";
import { greenIcon, yellowIcon, redIcon } from "./markerIcons";

export function getMarkerIcon(space: Space): Icon {
  if (space.availableSeats > 10) {
    return greenIcon; // 🟢 Available
  }

  if (space.availableSeats > 0) {
    return yellowIcon; // 🟡 Limited
  }

  return redIcon; // 🔴 Full
}
