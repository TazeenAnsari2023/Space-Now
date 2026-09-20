import { useEffect, useState } from "react";
import {
  formatMembershipPlan,
  getUserMemberships,
  payMembership,
  removeMembership,
  updateMembershipStatus,
  type UserMembership
} from "../../utils/memberships";
import {
  cancelBooking,
  createBooking,
  fetchMyBookings,
  verifyBookingPayment
} from "../../services/api";
import type { Booking, BookingSpaceRef } from "../../types/booking";

function UserYourSpaces() {
  const [memberships, setMemberships] = useState(getUserMemberships());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [message, setMessage] = useState("");
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [bookingError, setBookingError] = useState("");
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [payingSpaceId, setPayingSpaceId] = useState<string | null>(null);

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

  const loadBookings = async () => {
    try {
      setLoadingBookings(true);
      setBookingError("");
      const data = await fetchMyBookings();
      setBookings(data);
    } catch (err) {
      setBookings([]);
      setBookingError(err instanceof Error ? err.message : "Failed to load booking history");
    } finally {
      setLoadingBookings(false);
    }
  };

  useEffect(() => {
    void loadBookings();
  }, []);

  const onPayNow = async (membership: UserMembership) => {
    try {
      setPayingSpaceId(membership.spaceId);
      const billingTimestamp = new Date(membership.nextBillingDate).getTime();
      const fallbackTimestamp = Date.now() + 24 * 60 * 60 * 1000;
      const paymentTimestamp = Number.isFinite(billingTimestamp)
        ? Math.max(Date.now(), billingTimestamp)
        : fallbackTimestamp;
      const bookingDate = new Date(paymentTimestamp).toISOString().split("T")[0];

      const orderPayload = await createBooking({
        spaceId: membership.spaceId,
        date: bookingDate,
        seatsBooked: 1,
        plan: membership.plan
      });

      const handlePaymentSuccess = async (payload: {
        razorpay_order_id?: string;
        razorpay_payment_id?: string;
        razorpay_signature?: string;
      }) => {
        await verifyBookingPayment({
          bookingId: orderPayload.payment.bookingId,
          ...payload
        });

        const updatedMemberships = payMembership(membership.spaceId, bookingDate);
        setMemberships(updatedMemberships);
        await loadBookings();

        const paid = updatedMemberships.find((item) => item.spaceId === membership.spaceId);
        if (paid) {
          setMessage(
            `Payment successful for ${paid.spaceName}. Next billing date is ${new Date(
              paid.nextBillingDate
            ).toLocaleDateString()}.`
          );
        } else {
          setMessage("Payment successful.");
        }
      };

      if (orderPayload.payment.gateway === "mock") {
        const proceed = window.confirm(
          `Demo payment for Rs ${Math.round(orderPayload.payment.amount / 100)}. Click OK to simulate success.`
        );

        if (!proceed) {
          await cancelBooking(orderPayload.payment.bookingId);
          setMessage("Payment cancelled.");
          return;
        }

        await handlePaymentSuccess({
          razorpay_order_id: orderPayload.payment.orderId,
          razorpay_payment_id: `mock_membership_${Date.now()}`,
          razorpay_signature: "mock_signature"
        });
        return;
      }

      const sdkLoaded = await loadRazorpayScript();
      if (!sdkLoaded || !(window as any).Razorpay) {
        await cancelBooking(orderPayload.payment.bookingId);
        setMessage("Unable to load payment gateway.");
        return;
      }

      const options = {
        key: orderPayload.payment.keyId,
        amount: orderPayload.payment.amount,
        currency: orderPayload.payment.currency,
        name: "Space Now",
        description: `${formatMembershipPlan(membership.plan)} membership renewal`,
        order_id: orderPayload.payment.orderId,
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            await handlePaymentSuccess({
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
            } finally {
              setMessage("Payment cancelled.");
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
      setMessage(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setPayingSpaceId(null);
    }
  };

  const onPauseResume = (spaceId: string, current: "active" | "paused") => {
    const nextStatus = current === "active" ? "paused" : "active";
    setMemberships(updateMembershipStatus(spaceId, nextStatus));
  };

  const onCancel = (spaceId: string) => {
    setMemberships(removeMembership(spaceId));
  };

  const onCancelBooking = async (bookingId: string) => {
    try {
      await cancelBooking(bookingId);
      await loadBookings();
      setMessage("Booking updated successfully.");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to cancel booking");
    }
  };

  const getSpaceLabel = (space: string | BookingSpaceRef) => {
    if (typeof space === "string") {
      return "Unknown space";
    }
    return space.name || "Unknown space";
  };

  const formatBookingPlan = (plan?: Booking["plan"]) => {
    if (!plan) {
      return "Coworking Space";
    }
    return formatMembershipPlan(plan);
  };

  const sortedBookings = [...bookings].sort((a, b) => {
    const aTime = new Date(a.date).getTime();
    const bTime = new Date(b.date).getTime();
    return bTime - aTime;
  });

  const activeBookings = sortedBookings.filter(
    (booking) => booking.status === "confirmed" || booking.status === "pending"
  );
  const historyBookings = sortedBookings.filter(
    (booking) => booking.status === "cancelled" || booking.status === "payment_failed"
  );
  const visibleHistory = showAllHistory ? historyBookings : historyBookings.slice(0, 6);

  const getLastConfirmedPaymentText = (membership: UserMembership) => {
    const candidates = sortedBookings.filter((booking) => {
      const bookingSpaceId =
        typeof booking.spaceId === "string" ? booking.spaceId : booking.spaceId?._id;
      const bookingSpaceName =
        typeof booking.spaceId === "string" ? "" : (booking.spaceId?.name || "").toLowerCase();
      const membershipName = membership.spaceName.toLowerCase();

      return (
        booking.status === "confirmed" &&
        booking.paymentStatus === "paid" &&
        booking.plan === membership.plan &&
        (bookingSpaceId === membership.spaceId || bookingSpaceName === membershipName)
      );
    });

    const confirmed = candidates.sort((a, b) => {
      const aCycle = new Date(a.date).getTime();
      const bCycle = new Date(b.date).getTime();
      if (bCycle !== aCycle) {
        return bCycle - aCycle;
      }

      const aPaid = new Date(a.updatedAt || a.createdAt || a.date).getTime();
      const bPaid = new Date(b.updatedAt || b.createdAt || b.date).getTime();
      return bPaid - aPaid;
    })[0];

    if (!confirmed) {
      return "No successful payment yet.";
    }

    const amount = confirmed.totalAmount || (confirmed.unitPrice || 0) * confirmed.seatsBooked;
    const paidOn = new Date(
      confirmed.updatedAt || confirmed.createdAt || confirmed.date
    ).toLocaleDateString();
    const cycleDate = new Date(confirmed.date).toLocaleDateString();
    return `Last payment processed on ${paidOn} for billing cycle ${cycleDate} (Rs ${amount}).`;
  };

  return (
    <section className="surface-card section" style={{ width: "100%", margin: 0 }}>
      <h1 className="page-title">Your Spaces</h1>
      <p className="page-subtitle">Manage selected spaces, payments and memberships.</p>
      {message && (
        <p style={{ color: message.toLowerCase().includes("failed") ? "#b42318" : "#15803d", marginTop: 0 }}>
          {message}
        </p>
      )}

      {memberships.length === 0 ? (
        <p>No memberships yet. Use Search Space and add one.</p>
      ) : (
        <div className="space-grid">
          {memberships.map((item) => (
            <article key={item.spaceId} className="surface-card space-card">
              <h3>{item.spaceName}</h3>
              <p style={{ margin: "0.2rem 0" }}>Plan: {formatMembershipPlan(item.plan)}</p>
              <p style={{ margin: "0.2rem 0" }}>Status: {item.status}</p>
              <p style={{ margin: "0.2rem 0" }}>Monthly Price: Rs {item.monthlyPrice}</p>
              <p style={{ margin: "0.2rem 0" }}>
                Next Billing: {new Date(item.nextBillingDate).toLocaleDateString()}
              </p>
              <p className="page-subtitle" style={{ marginTop: "0.2rem" }}>
                {getLastConfirmedPaymentText(item)}
              </p>

              <div className="row">
                <button
                  className="btn btn-primary"
                  onClick={() => void onPayNow(item)}
                  disabled={payingSpaceId === item.spaceId}
                >
                  {payingSpaceId === item.spaceId ? "Processing..." : "Pay Now"}
                </button>

                <button
                  className="btn btn-outline"
                  onClick={() => onPauseResume(item.spaceId, item.status)}
                >
                  {item.status === "active" ? "Pause Membership" : "Resume Membership"}
                </button>

                <button className="btn btn-danger" onClick={() => onCancel(item.spaceId)}>
                  Cancel
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <hr style={{ margin: "1.5rem 0" }} />

      <h2 style={{ marginTop: 0 }}>Seat Bookings</h2>
      {loadingBookings ? (
        <p>Loading booking history...</p>
      ) : bookingError ? (
        <p style={{ color: "#b42318" }}>{bookingError}</p>
      ) : activeBookings.length === 0 && historyBookings.length === 0 ? (
        <p>No bookings yet. Book from a space details page.</p>
      ) : (
        <>
          {activeBookings.length > 0 && (
            <>
              <h3 style={{ marginTop: "0.6rem" }}>Active & Upcoming</h3>
              <div className="space-grid">
                {activeBookings.map((booking) => (
                  <article key={booking._id} className="surface-card space-card">
                    <h3>{getSpaceLabel(booking.spaceId)}</h3>
                    <p style={{ margin: "0.2rem 0" }}>Plan: {formatBookingPlan(booking.plan)}</p>
                    <p style={{ margin: "0.2rem 0" }}>Seats: {booking.seatsBooked}</p>
                    <p style={{ margin: "0.2rem 0" }}>
                      Date: {new Date(booking.date).toLocaleDateString()}
                    </p>
                    <p style={{ margin: "0.2rem 0" }}>Status: {booking.status}</p>
                    <p style={{ margin: "0.2rem 0" }}>Payment: {booking.paymentStatus || "n/a"}</p>
                    <p style={{ margin: "0.2rem 0" }}>
                      Amount: Rs {booking.totalAmount || (booking.unitPrice || 0) * booking.seatsBooked}
                    </p>
                    {(booking.status === "confirmed" ||
                      booking.status === "pending" ||
                      booking.status === "payment_failed") && (
                      <button className="btn btn-danger" onClick={() => void onCancelBooking(booking._id)}>
                        {booking.status === "confirmed" ? "Cancel Booking" : "Remove Pending Booking"}
                      </button>
                    )}
                  </article>
                ))}
              </div>
            </>
          )}

          {historyBookings.length > 0 && (
            <>
              <h3 style={{ marginTop: "1.1rem" }}>History</h3>
              <p className="page-subtitle" style={{ marginTop: 0 }}>
                Showing {visibleHistory.length} of {historyBookings.length} historical records.
              </p>
              <div className="space-grid">
                {visibleHistory.map((booking) => (
                  <article key={booking._id} className="surface-card space-card">
                    <h3>{getSpaceLabel(booking.spaceId)}</h3>
                    <p style={{ margin: "0.2rem 0" }}>Plan: {formatBookingPlan(booking.plan)}</p>
                    <p style={{ margin: "0.2rem 0" }}>Seats: {booking.seatsBooked}</p>
                    <p style={{ margin: "0.2rem 0" }}>
                      Date: {new Date(booking.date).toLocaleDateString()}
                    </p>
                    <p style={{ margin: "0.2rem 0" }}>Status: {booking.status}</p>
                    <p style={{ margin: "0.2rem 0" }}>Payment: {booking.paymentStatus || "n/a"}</p>
                  </article>
                ))}
              </div>
              {historyBookings.length > 6 && (
                <button
                  className="btn btn-outline"
                  onClick={() => setShowAllHistory((prev) => !prev)}
                  style={{ marginTop: "0.6rem" }}
                >
                  {showAllHistory ? "Show Less History" : "Show Full History"}
                </button>
              )}
            </>
          )}
        </>
      )}
      {!loadingBookings && bookings.length > 0 && (
        <button className="btn btn-outline" onClick={() => void loadBookings()} style={{ marginTop: "1rem" }}>
          Refresh Booking Data
        </button>
      )}
    </section>
  );
}

export default UserYourSpaces;
