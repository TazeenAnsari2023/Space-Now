import type { Review } from "../types/space";
import StarRating from "./StarRating";
import ReviewBadge from "./ReviewBadge";

interface Props {
  reviews?: Review[];
}

function ReviewList({ reviews }: Props) {
  if (!reviews || reviews.length === 0) {
    return <p>No reviews yet.</p>;
  }

  return (
    <div className="space-grid">
      <h3>Reviews</h3>

      {reviews.map((review, index) => {
        const authorName =
          typeof review.userId === "object" && review.userId !== null ? review.userId.name : "User";

        const confidence = review.confidence ?? review.confidenceScore;

        return (
          <article key={review._id || index} className="surface-card space-card">
            <div>
              <strong>{authorName}</strong>
            </div>
            <StarRating rating={review.rating} />
            <ReviewBadge isFake={review.isFake} />
            <p>{review.comment}</p>

            {confidence !== undefined && review.isFake && (
              <small>Confidence: {Math.round(confidence * 100)}%</small>
            )}
          </article>
        );
      })}
    </div>
  );
}

export default ReviewList;
