import { useEffect, useState } from "react";
import { fetchOwnerAnalytics, fetchOwnerBookings } from "../../services/api";
import type { Booking, BookingSpaceRef, BookingUserRef } from "../../types/booking";
import type { OwnerAnalytics } from "../../types/booking";

function OwnerDashboard() {
  const [analytics, setAnalytics] = useState<OwnerAnalytics | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    fetchOwnerAnalytics().then(setAnalytics).catch(() => setAnalytics(null));
    fetchOwnerBookings().then(setBookings).catch(() => setBookings([]));
  }, []);

  const totalSpaces = analytics?.totalSpaces || 0;
  const totalSeats = analytics?.totalAvailableSeats || 0;
  const avgPrice = analytics?.avgPrice || 0;
  const totalBookings = analytics?.totalBookings || 0;
  const upcomingBookings = analytics?.upcomingBookings || 0;
  const totalSeatsBooked = analytics?.totalSeatsBooked || 0;

  const getSpaceLabel = (space: string | BookingSpaceRef) =>
    typeof space === "string" ? "Unknown space" : space.name || "Unknown space";
  const getUserLabel = (user: string | BookingUserRef) =>
    typeof user === "string" ? "Unknown user" : user.name || user.username || user.email || "Unknown user";

  return (
    <section className="surface-card section" style={{ width: "100%", margin: 0 }}>
      <h1 className="page-title">Dashboard</h1>
      <p className="page-subtitle">Track your listings performance.</p>

      <div className="stat-grid">
        <article className="surface-card stat-card">
          <h3>Total Spaces</h3>
          <p>{totalSpaces}</p>
        </article>

        <article className="surface-card stat-card">
          <h3>Total Available Seats</h3>
          <p>{totalSeats}</p>
        </article>

        <article className="surface-card stat-card">
          <h3>Average Price/Month</h3>
          <p>{avgPrice}</p>
        </article>

        <article className="surface-card stat-card">
          <h3>Total Bookings</h3>
          <p>{totalBookings}</p>
        </article>

        <article className="surface-card stat-card">
          <h3>Upcoming Bookings</h3>
          <p>{upcomingBookings}</p>
        </article>

        <article className="surface-card stat-card">
          <h3>Total Seats Booked</h3>
          <p>{totalSeatsBooked}</p>
        </article>
      </div>

      <section className="surface-card" style={{ marginTop: "1rem", padding: "1rem" }}>
        <h3 style={{ marginTop: 0 }}>Recent Bookings</h3>
        {bookings.length === 0 ? (
          <p>No bookings yet.</p>
        ) : (
          <div className="space-grid">
            {bookings.slice(0, 6).map((booking) => (
              <article key={booking._id} className="surface-card space-card">
                <h4>{getSpaceLabel(booking.spaceId)}</h4>
                <p style={{ margin: "0.2rem 0" }}>User: {getUserLabel(booking.userId)}</p>
                <p style={{ margin: "0.2rem 0" }}>Date: {new Date(booking.date).toLocaleDateString()}</p>
                <p style={{ margin: "0.2rem 0" }}>Seats: {booking.seatsBooked}</p>
                <p style={{ margin: "0.2rem 0" }}>Status: {booking.status}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

export default OwnerDashboard;
