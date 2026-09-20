import { useEffect, useState } from "react";
import { deleteAdminReview, fetchAdminReviews, type AdminReview } from "../../services/admin";

function readUserLabel(review: AdminReview) {
  if (!review.userId || typeof review.userId === "string") {
    return "Unknown user";
  }
  return review.userId.name || review.userId.username || "Unknown user";
}

function readSpaceLabel(review: AdminReview) {
  if (!review.spaceId || typeof review.spaceId === "string") {
    return "Unknown space";
  }
  return review.spaceId.name || "Unknown space";
}

function AdminReviews() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fakeOnly, setFakeOnly] = useState(false);
  const [actionId, setActionId] = useState<string>("");

  const load = async (onlyFake: boolean) => {
    try {
      setLoading(true);
      setError("");
      const data = await fetchAdminReviews(onlyFake);
      setReviews(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reviews");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(fakeOnly);
  }, [fakeOnly]);

  const handleDelete = async (reviewId: string) => {
    if (!window.confirm("Delete this review?")) {
      return;
    }

    try {
      setActionId(reviewId);
      await deleteAdminReview(reviewId);
      await load(fakeOnly);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete review");
    } finally {
      setActionId("");
    }
  };

  return (
    <section className="surface-card section" style={{ width: "100%", margin: 0 }}>
      <h1 className="page-title">Review Moderation</h1>
      <p className="page-subtitle">Inspect potentially fake or abusive reviews and remove when needed.</p>

      <div className="row" style={{ marginBottom: "1rem", gap: "0.7rem" }}>
        <button className={`btn ${!fakeOnly ? "btn-primary" : "btn-outline"}`} onClick={() => setFakeOnly(false)}>
          All Reviews
        </button>
        <button className={`btn ${fakeOnly ? "btn-primary" : "btn-outline"}`} onClick={() => setFakeOnly(true)}>
          Fake Only
        </button>
      </div>

      {loading && <p>Loading reviews...</p>}
      {error && <p className="error-text">{error}</p>}

      {!loading && reviews.length === 0 ? (
        <p>No reviews found.</p>
      ) : (
        <div className="space-grid">
          {reviews.map((review) => (
            <article key={review._id} className="surface-card space-card">
              <h3>{readSpaceLabel(review)}</h3>
              <p style={{ margin: "0.2rem 0" }}>By: {readUserLabel(review)}</p>
              <p style={{ margin: "0.2rem 0" }}>Rating: {review.rating}/5</p>
              <p style={{ margin: "0.2rem 0" }}>{review.comment}</p>
              <p style={{ margin: "0.2rem 0" }}>Fake Flag: {review.isFake ? "Yes" : "No"}</p>
              <p style={{ margin: "0.2rem 0" }}>Confidence: {review.confidenceScore}</p>
              <div className="row">
                <button
                  className="btn btn-danger"
                  disabled={actionId === review._id}
                  onClick={() => void handleDelete(review._id)}
                >
                  Remove Review
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default AdminReviews;
