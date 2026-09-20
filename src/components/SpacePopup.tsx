import type { Space } from "../types/space";
import { Link } from "react-router-dom";
import { calculateDistanceKm } from "../utils/distance";
import FavoriteButton from "./FavoriteButton";

interface Props {
  space: Space;
  userLat: number;
  userLng: number;
}

function SpacePopup({ space, userLat, userLng }: Props) {
  const spaceLat = space.location.coordinates[1];
  const spaceLng = space.location.coordinates[0];

  const distanceKm = calculateDistanceKm(
    userLat,
    userLng,
    spaceLat,
    spaceLng
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h3>{space.name}</h3>
        <FavoriteButton space={space} /> {/* ❤️ HERE */}
      </div>

      <p>📍 {distanceKm} km away</p>

      <p>
        {space.availableSeats > 10 && "🟢 Seats Available"}
        {space.availableSeats > 0 &&
          space.availableSeats <= 10 &&
          "🟡 Limited Seats"}
        {space.availableSeats === 0 && "🔴 Fully Occupied"}
      </p>

      <p>₹ {space.pricePerMonth} / month</p>

      <p>
        {space.amenities.wifi && "📶 WiFi "}
        {space.amenities.ac && "❄️ AC "}
        {space.amenities.parking && "🚗 Parking"}
      </p>

      <Link to={`/space/${space._id}`}>View Details</Link>
    </div>
  );
}

export default SpacePopup;
