import { useState } from "react";

interface Props {
  onSubmit: (review: { rating: number; comment: string }) => Promise<void> | void;
}

function ReviewForm({ onSubmit }: Props) {
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || submitting) {
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit({ rating, comment });
      setComment("");
      setRating(5);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="form-grid" style={{ marginTop: "1rem" }}>
      <h4>Add Review</h4>

      <label className="field">
        Rating
        <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
          {[5, 4, 3, 2, 1].map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        Comment
        <textarea
          placeholder="Write your review..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
        />
      </label>

      <button className="btn btn-primary" type="submit" disabled={submitting}>
        {submitting ? "Submitting..." : "Submit Review"}
      </button>
    </form>
  );
}

export default ReviewForm;
