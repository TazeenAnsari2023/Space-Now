interface Props {
  rating: number;
}

function StarRating({ rating }: Props) {
  return (
    <span>
      {[1, 2, 3, 4, 5].map(num => (
        <span key={num}>
          {num <= rating ? "⭐" : "☆"}
        </span>
      ))}
    </span>
  );
}

export default StarRating;
