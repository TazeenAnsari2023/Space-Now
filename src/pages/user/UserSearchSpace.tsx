import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchNearbySpaces } from "../../services/api";
import type { Space } from "../../types/space";
import { getFavorites, toggleFavorite } from "../../utils/favorites";
import { addUserMembership, formatMembershipPlan, type MembershipPlan } from "../../utils/memberships";

interface Coordinates {
  lat: number;
  lng: number;
}

const DEFAULT_LOCATION: Coordinates = { lat: 21.1458, lng: 79.0882 };
const MapView = lazy(() => import("../../components/MapView"));

const toRad = (value: number) => (value * Math.PI) / 180;
const distanceInKm = (aLat: number, aLng: number, bLat: number, bLng: number) => {
  const earthRadiusKm = 6371;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const aa =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return earthRadiusKm * c;
};

function UserSearchSpace() {
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [query, setQuery] = useState("");
  const [budget, setBudget] = useState("all");
  const [radiusKm, setRadiusKm] = useState(0);
  const [minRating, setMinRating] = useState(0);
  const [minSeats, setMinSeats] = useState(0);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [favoriteIds, setFavoriteIds] = useState<string[]>(getFavorites().map((item) => item._id));
  const [selectedPlans, setSelectedPlans] = useState<Record<string, MembershipPlan>>({});
  const [message, setMessage] = useState("");
  const [locationNotice, setLocationNotice] = useState("");

  const loadNearbySpaces = async (location: Coordinates, radius = radiusKm, nextPage = page) => {
    setCoords(location);
    try {
      setLoading(true);
      const priceRange =
        budget === "low"
          ? { priceMax: 5000 }
          : budget === "mid"
            ? { priceMin: 5001, priceMax: 9000 }
            : budget === "high"
              ? { priceMin: 9001 }
              : {};
      const data = await fetchNearbySpaces(location.lat, location.lng, {
        radiusKm: radius,
        page: nextPage,
        limit: 80,
        minRating: minRating > 0 ? minRating : undefined,
        minAvailableSeats: minSeats > 0 ? minSeats : undefined,
        ...priceRange
      });
      setSpaces(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setPage(data.page);
    } catch {
      setSpaces([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const locateUser = (highAccuracy = false) => {
    if (!navigator.geolocation) {
      setLocationNotice("Geolocation is not supported. Showing default results near Nagpur.");
      void loadNearbySpaces(DEFAULT_LOCATION, radiusKm, 1);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setLocationNotice("");
        await loadNearbySpaces({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
      },
      () => {
        setLocationNotice("Location access denied. Showing default results near Nagpur.");
        void loadNearbySpaces(DEFAULT_LOCATION, radiusKm, 1);
      },
      {
        enableHighAccuracy: highAccuracy,
        timeout: 15000,
        maximumAge: 0
      }
    );
  };

  useEffect(() => {
    locateUser(false);
  }, []);

  useEffect(() => {
    if (coords) {
      void loadNearbySpaces(coords, radiusKm, 1);
    }
  }, [radiusKm, budget, minRating, minSeats]);

  useEffect(() => {
    if (coords) {
      void loadNearbySpaces(coords, radiusKm, page);
    }
  }, [page]);

  const filteredSpaces = useMemo(() => {
    return spaces.filter((space) => {
      const byName = space.name.toLowerCase().includes(query.toLowerCase());
      const byBudget =
        budget === "low"
          ? space.pricePerMonth <= 5000
          : budget === "mid"
            ? space.pricePerMonth > 5000 && space.pricePerMonth <= 9000
            : budget === "high"
              ? space.pricePerMonth > 9000
              : true;
      const byRating = minRating > 0 ? (space.rating || 0) >= minRating : true;
      const bySeats = minSeats > 0 ? space.availableSeats >= minSeats : true;
      const byDistance =
        radiusKm > 0 && coords
          ? distanceInKm(
              coords.lat,
              coords.lng,
              space.location.coordinates[1],
              space.location.coordinates[0]
            ) <= radiusKm
          : true;

      return byName && byBudget && byRating && bySeats && byDistance;
    });
  }, [spaces, query, budget, minRating, minSeats, radiusKm, coords]);

  const handleFavorite = (space: Space) => {
    const updated = toggleFavorite(space);
    setFavoriteIds(updated.map((item) => item._id));
  };

  const handleAddMembership = (space: Space) => {
    const plan = selectedPlans[space._id] || "coworking-space";
    addUserMembership(space, plan);
    setMessage(`${space.name} added to Your Spaces with ${formatMembershipPlan(plan)} plan.`);
  };

  if (loading) {
    return (
      <section className="surface-card section" style={{ width: "100%", margin: 0 }}>
        <h2 className="page-title">Finding spaces...</h2>
      </section>
    );
  }

  if (!coords) {
    return (
      <section className="surface-card section" style={{ width: "100%", margin: 0 }}>
        <h2 className="page-title">Location unavailable</h2>
        <button className="btn btn-primary" onClick={() => locateUser(true)} style={{ marginTop: "0.8rem" }}>
          Retry Location Access
        </button>
      </section>
    );
  }

  return (
    <section style={{ width: "100%" }}>
      <section className="home-shell" style={{ width: "100%", margin: 0 }}>
        <h1 className="page-title">Search Space</h1>
        <p className="page-subtitle">Search by workspace name, filter by pricing, and pin your exact location.</p>
        {locationNotice && <p className="page-subtitle">{locationNotice}</p>}

        <div className="surface-card home-controls">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search workspace"
            className="control-input"
          />

          <select value={budget} onChange={(e) => setBudget(e.target.value)} className="control-input">
            <option value="all">All Prices</option>
            <option value="low">Budget (up to 5000)</option>
            <option value="mid">Standard (5001 - 9000)</option>
            <option value="high">Premium (above 9000)</option>
          </select>

          <select
            value={minRating}
            onChange={(e) => setMinRating(Number(e.target.value))}
            className="control-input"
          >
            <option value={0}>All Ratings</option>
            <option value={4.5}>4.5+ rating</option>
            <option value={4}>4.0+ rating</option>
            <option value={3.5}>3.5+ rating</option>
            <option value={3}>3.0+ rating</option>
          </select>

          <select
            value={minSeats}
            onChange={(e) => setMinSeats(Number(e.target.value))}
            className="control-input"
          >
            <option value={0}>All Seats</option>
            <option value={5}>5+ seats</option>
            <option value={10}>10+ seats</option>
            <option value={20}>20+ seats</option>
            <option value={30}>30+ seats</option>
          </select>

          <select
            value={radiusKm}
            onChange={(e) => setRadiusKm(Number(e.target.value))}
            className="control-input"
          >
            <option value={0}>All Places</option>
            <option value={10}>10 km radius</option>
            <option value={30}>30 km radius</option>
            <option value={60}>60 km radius</option>
            <option value={100}>100 km radius</option>
          </select>

          <button className="btn btn-primary" onClick={() => locateUser(true)}>
            Pin Current Location
          </button>
        </div>

        <p className="page-subtitle" style={{ marginTop: "0.7rem" }}>
          Showing {filteredSpaces.length} filtered places (page {page}/{totalPages}, loaded {spaces.length}, total {total}).
        </p>

        <div className="row" style={{ marginBottom: "0.7rem", gap: "0.6rem" }}>
          <button className="btn btn-outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <button className="btn btn-outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>

        {message && <p style={{ color: "#15803d", marginTop: 0 }}>{message}</p>}

        <div className="map-wrap" style={{ marginBottom: "1rem" }}>
          <Suspense fallback={<p className="page-subtitle">Loading map...</p>}>
            <MapView lat={coords.lat} lng={coords.lng} spaces={filteredSpaces} />
          </Suspense>
        </div>

        <div className="space-grid">
          {filteredSpaces.map((space) => (
            <article key={space._id} className="surface-card space-card">
              <h3>{space.name}</h3>
              <p className="page-subtitle" style={{ margin: 0 }}>
                Rs {space.pricePerMonth}/month
              </p>

              <div className="row">
                <Link to={`/space/${space._id}`} className="btn btn-outline">
                  View Place
                </Link>

                <button className="btn btn-outline" onClick={() => handleFavorite(space)}>
                  {favoriteIds.includes(space._id) ? "Remove Favorite" : "Add Favorite"}
                </button>

                <select
                  className="control-input"
                  style={{ maxWidth: "220px" }}
                  value={selectedPlans[space._id] || "coworking-space"}
                  onChange={(e) =>
                    setSelectedPlans((prev) => ({
                      ...prev,
                      [space._id]: e.target.value as MembershipPlan
                    }))
                  }
                >
                  <option value="coworking-space">Coworking Space</option>
                  <option value="private-office">Private Office</option>
                  <option value="virtual-office">Virtual Office</option>
                  <option value="serviced-office">Serviced Office</option>
                </select>

                <button className="btn btn-primary" onClick={() => handleAddMembership(space)}>
                  Add To Your Spaces
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

export default UserSearchSpace;

