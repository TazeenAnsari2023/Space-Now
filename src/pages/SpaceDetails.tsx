import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ReviewForm from "../components/ReviewForm";
import ReviewList from "../components/ReviewList";
import {
  cancelBooking,
  createBooking,
  createReview,
  createSpaceLead,
  fetchReviews,
  fetchSpaceById,
  verifyBookingPayment
} from "../services/api";
import { isAuthenticated } from "../utils/auth";
import { getFavorites, toggleFavorite } from "../utils/favorites";
import { addUserMembership, formatMembershipPlan, type MembershipPlan } from "../utils/memberships";
import type { Review, Space } from "../types/space";

function SpaceDetails() {
  const { id } = useParams<{ id: string }>();
  const [space, setSpace] = useState<Space | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan>("coworking-space");
  const [favoriteIds, setFavoriteIds] = useState<string[]>(getFavorites().map((item) => item._id));
  const [message, setMessage] = useState("");
  const [leadLoading, setLeadLoading] = useState<"quote" | "tour" | null>(null);
  const [bookingDate, setBookingDate] = useState("");
  const [bookingSeats, setBookingSeats] = useState(1);
  const [bookingStep, setBookingStep] = useState<1 | 2 | 3>(1);
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "card" | "netbanking">("upi");
  const [bookingLoading, setBookingLoading] = useState(false);

  const loadRazorpayScript = () => {
    return new Promise<boolean>((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  useEffect(() => {
    if (!id) {
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const [spaceData, reviewData] = await Promise.all([fetchSpaceById(id), fetchReviews(id)]);
        setSpace(spaceData);
        setReviews(reviewData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load space details");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [id]);

  const addReview = async (review: { rating: number; comment: string }) => {
    if (!id) {
      return;
    }

    try {
      const created = await createReview({
        spaceId: id,
        rating: review.rating,
        comment: review.comment
      });

      setReviews((prev) => [created, ...prev]);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to submit review");
    }
  };

  const handleFavorite = () => {
    if (!space) {
      return;
    }

    try {
      const updated = toggleFavorite(space);
      setFavoriteIds(updated.map((item) => item._id));
      setMessage(
        updated.some((item) => item._id === space._id)
          ? `${space.name} added to favorites.`
          : `${space.name} removed from favorites.`
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Please login first to add favorites.");
    }
  };

  const handleAddMembership = () => {
    if (!space) {
      return;
    }

    try {
      addUserMembership(space, selectedPlan);
      setMessage(`${space.name} added to Your Spaces with ${formatMembershipPlan(selectedPlan)} plan.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Please login first to add this place.");
    }
  };

  const handleLeadAction = async (action: "quote" | "tour") => {
    if (!space) {
      return;
    }

    if (!isAuthenticated()) {
      setMessage("Please login first to request a quote or book a tour.");
      return;
    }

    try {
      setLeadLoading(action);
      const response = await createSpaceLead({
        spaceId: space._id,
        action
      });
      setMessage(response.message);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Action failed");
    } finally {
      setLeadLoading(null);
    }
  };

  const handleBookSeats = async () => {
    if (!space) {
      return;
    }

    if (!isAuthenticated()) {
      setMessage("Please login first to book seats.");
      return;
    }

    if (!bookingDate) {
      setMessage("Please select booking date.");
      return;
    }

    if (!Number.isInteger(bookingSeats) || bookingSeats <= 0) {
      setMessage("Please enter valid seat count.");
      return;
    }

    try {
      setBookingLoading(true);
      const orderPayload = await createBooking({
        spaceId: space._id,
        date: bookingDate,
        seatsBooked: bookingSeats,
        plan: selectedPlan
      });

      const handleBookingSuccess = async (verificationPayload: {
        razorpay_order_id?: string;
        razorpay_payment_id?: string;
        razorpay_signature?: string;
      }) => {
        const verification = await verifyBookingPayment({
          bookingId: orderPayload.payment.bookingId,
          ...verificationPayload
        });

        addUserMembership(space, selectedPlan);
        setMessage(
          `${verification.message}. Booking confirmed for ${bookingSeats} seat(s) on ${new Date(
            bookingDate
          ).toLocaleDateString()}.`
        );
        setSpace({
          ...space,
          availableSeats: Math.max(0, space.availableSeats - bookingSeats)
        });
        setBookingStep(1);
      };

      if (orderPayload.payment.gateway === "mock") {
        const proceed = window.confirm(
          `Demo payment for Rs ${Math.round(orderPayload.payment.amount / 100)}. Click OK to simulate successful payment.`
        );

        if (!proceed) {
          setMessage("Mock payment cancelled. Booking is still pending payment.");
          return;
        }

        await handleBookingSuccess({
          razorpay_order_id: orderPayload.payment.orderId,
          razorpay_payment_id: `mock_payment_${Date.now()}`,
          razorpay_signature: "mock_signature"
        });
        return;
      }

      const sdkLoaded = await loadRazorpayScript();
      if (!sdkLoaded || !(window as any).Razorpay) {
        setMessage("Unable to load payment gateway. Please try again.");
        return;
      }

      const options = {
        key: orderPayload.payment.keyId,
        amount: orderPayload.payment.amount,
        currency: orderPayload.payment.currency,
        name: "Space Now",
        description: `${formatMembershipPlan(selectedPlan)} booking payment`,
        order_id: orderPayload.payment.orderId,
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            await handleBookingSuccess({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });
          } catch (err) {
            setMessage(err instanceof Error ? err.message : "Payment verification failed");
          }
        },
        modal: {
          ondismiss: async () => {
            try {
              await cancelBooking(orderPayload.payment.bookingId);
              setMessage("Payment cancelled. Pending booking removed.");
            } catch {
              setMessage("Payment cancelled. You can remove pending booking from Your Spaces.");
            }
          }
        },
        theme: {
          color: "#0b7d77"
        }
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.open();
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Booking failed";
      if (raw.toLowerCase().includes("authentication failed")) {
        setMessage(
          "Razorpay authentication failed. Regenerate test key/secret pair in Razorpay, update server .env, and restart backend."
        );
      } else {
        setMessage(raw);
      }
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return <section className="section surface-card">Loading space details...</section>;
  }

  if (error) {
    return <section className="section surface-card">{error}</section>;
  }

  if (!space) {
    return <section className="section surface-card">Space not found.</section>;
  }

  const pricing = space.pricing || {
    servicedOffice: (space.pricePerMonth || 0) + 12000,
    coworkingSpace: space.pricePerMonth,
    privateOffice: (space.pricePerMonth || 0) + 7000,
    virtualOffice: 2500
  };

  const highlights = space.amenityHighlights || [
    "WiFi",
    "Air Conditioning",
    "Parking",
    "Meeting Rooms",
    "Printing"
  ];

  const gallery =
    space.photos && space.photos.length > 0
      ? space.photos
      : [
          "https://picsum.photos/seed/default-1/1200/800",
          "https://picsum.photos/seed/default-2/1200/800",
          "https://picsum.photos/seed/default-3/1200/800",
          "https://picsum.photos/seed/default-4/1200/800"
        ];

  const rating = space.rating || 4.6;
  const isFavoriteSpace = favoriteIds.includes(space._id);
  const planUnitPrice =
    selectedPlan === "private-office"
      ? pricing.privateOffice ?? space.pricePerMonth
      : selectedPlan === "virtual-office"
        ? pricing.virtualOffice ?? space.pricePerMonth
        : selectedPlan === "serviced-office"
          ? pricing.servicedOffice ?? space.pricePerMonth
          : pricing.coworkingSpace ?? space.pricePerMonth;
  const totalBookingAmount =
    planUnitPrice * bookingSeats;

  return (
    <section className="space-details-shell">
      <div className="space-gallery">
        <img className="space-main-photo" src={gallery[0]} alt={space.name} />
        <div className="space-thumb-grid">
          {gallery.slice(1, 5).map((photo, idx) => (
            <img key={idx} src={photo} alt={`${space.name}-${idx + 2}`} />
          ))}
        </div>
      </div>

      <div className="space-content-grid">
        <div>
          <h1 className="page-title">Coworking Space: {space.name}</h1>
          <p className="page-subtitle">
            {space.city}, {space.state}
          </p>

          <h3>Coworking Space Amenities</h3>
          <div className="amenity-grid">
            {highlights.map((item) => (
              <span key={item} className="amenity-pill">
                {item}
              </span>
            ))}
          </div>

          <h3>Map</h3>
          <p>{space.address || `${space.city || ""}, ${space.state || ""}`}</p>
          <div className="detail-map-box">
            <iframe
              title="Space map"
              width="100%"
              height="280"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://maps.google.com/maps?q=${space.location.coordinates[1]},${space.location.coordinates[0]}&z=13&output=embed`}
            />
          </div>

          <h3>Overview</h3>
          <p>{space.overview || "A flexible workspace built for teams, founders, and freelancers."}</p>

          <h3>Pricing Plans</h3>
          <div className="pricing-grid">
            <article className="surface-card pricing-card">
              <h4>Coworking Space</h4>
              <p>{pricing.coworkingSpace}/month</p>
            </article>
            <article className="surface-card pricing-card">
              <h4>Private Office</h4>
              <p>{pricing.privateOffice}/month</p>
            </article>
            <article className="surface-card pricing-card">
              <h4>Virtual Office</h4>
              <p>{pricing.virtualOffice}/month</p>
            </article>
            <article className="surface-card pricing-card">
              <h4>Serviced Office</h4>
              <p>{pricing.servicedOffice}/month</p>
            </article>
          </div>

          <h3>Reviews</h3>
          <p>
            <strong>{rating.toFixed(1)}</strong> ({space.reviewCount || reviews.length} reviews)
          </p>
          <ReviewList reviews={reviews} />

          {isAuthenticated() ? <ReviewForm onSubmit={addReview} /> : <p>Please login to submit a review.</p>}
        </div>

        <aside className="surface-card detail-price-box">
          <h3>Serviced Office</h3>
          <p>from {pricing.servicedOffice}/month</p>
          <h3>Coworking Space</h3>
          <p>from {pricing.coworkingSpace}/month</p>
          <button className="btn btn-primary" type="button" onClick={() => void handleLeadAction("quote")} disabled={leadLoading !== null}>
            {leadLoading === "quote" ? "SENDING..." : "GET QUOTE"}
          </button>
          <button className="btn btn-outline" type="button" onClick={() => void handleLeadAction("tour")} disabled={leadLoading !== null}>
            {leadLoading === "tour" ? "BOOKING..." : "BOOK A TOUR"}
          </button>

          <div className="surface-card" style={{ marginTop: "1rem", padding: "0.8rem" }}>
            <h4 style={{ marginTop: 0 }}>Book Seats</h4>
            <p style={{ marginTop: 0, color: "#475467" }}>
              Step {bookingStep}/3: Select plan → seats/date → finalize payment
            </p>

            {bookingStep === 1 && (
              <>
                <label className="field">
                  Plan
                  <select
                    className="control-input"
                    value={selectedPlan}
                    onChange={(e) => setSelectedPlan(e.target.value as MembershipPlan)}
                  >
                    <option value="coworking-space">Coworking Space</option>
                    <option value="private-office">Private Office</option>
                    <option value="virtual-office">Virtual Office</option>
                    <option value="serviced-office">Serviced Office</option>
                  </select>
                </label>
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={() => {
                    if (!isAuthenticated()) {
                      setMessage("Please login first to book seats.");
                      return;
                    }
                    setBookingStep(2);
                  }}
                >
                  Continue To Seats
                </button>
              </>
            )}

            {bookingStep === 2 && (
              <>
                <label className="field">
                  Date
                  <input
                    type="date"
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                  />
                </label>
                <label className="field">
                  Seats
                  <input
                    type="number"
                    min={1}
                    max={space.availableSeats || 1}
                    value={bookingSeats}
                    onChange={(e) => setBookingSeats(Number(e.target.value))}
                  />
                </label>
                <div className="row" style={{ gap: "0.6rem" }}>
                  <button className="btn btn-outline" type="button" onClick={() => setBookingStep(1)}>
                    Back
                  </button>
                  <button
                    className="btn btn-primary"
                    type="button"
                    onClick={() => {
                      if (!bookingDate) {
                        setMessage("Please select booking date.");
                        return;
                      }
                      if (!Number.isInteger(bookingSeats) || bookingSeats <= 0) {
                        setMessage("Please enter valid seat count.");
                        return;
                      }
                      setBookingStep(3);
                    }}
                  >
                    Continue To Payment
                  </button>
                </div>
              </>
            )}

            {bookingStep === 3 && (
              <>
                <label className="field">
                  Payment Method
                  <select
                    className="control-input"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as "upi" | "card" | "netbanking")}
                  >
                    <option value="upi">UPI</option>
                    <option value="card">Card</option>
                    <option value="netbanking">Net Banking</option>
                  </select>
                </label>
                <p style={{ margin: "0.2rem 0" }}>
                  Plan: <strong>{formatMembershipPlan(selectedPlan)}</strong>
                </p>
                <p style={{ margin: "0.2rem 0" }}>
                  Seats: <strong>{bookingSeats}</strong>
                </p>
                <p style={{ margin: "0.2rem 0" }}>
                  Amount: <strong>Rs {totalBookingAmount}</strong>
                </p>
                <div className="row" style={{ gap: "0.6rem" }}>
                  <button className="btn btn-outline" type="button" onClick={() => setBookingStep(2)}>
                    Back
                  </button>
                  <button className="btn btn-primary" type="button" disabled={bookingLoading} onClick={() => void handleBookSeats()}>
                    {bookingLoading ? "PROCESSING PAYMENT..." : `Finalize Payment (${paymentMethod.toUpperCase()})`}
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="row" style={{ marginTop: "1rem", flexWrap: "wrap" }}>
            <button className="btn btn-outline" type="button" onClick={handleFavorite} disabled={!isAuthenticated()}>
              {isAuthenticated() ? (isFavoriteSpace ? "Remove Favorite" : "Add Favorite") : "Login To Favorite"}
            </button>

            <button className="btn btn-primary" type="button" onClick={handleAddMembership} disabled={!isAuthenticated()}>
              Add To Your Spaces
            </button>
          </div>

          {message && <p style={{ color: message.includes("failed") || message.includes("Please login") ? "#b42318" : "#15803d", margin: "0.75rem 0 0" }}>{message}</p>}
        </aside>
      </div>
    </section>
  );
}

export default SpaceDetails;
