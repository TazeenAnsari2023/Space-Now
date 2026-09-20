interface Props {
  isFake?: boolean;
}

function ReviewBadge({ isFake }: Props) {
  if (isFake === undefined) {
    return null;
  }

  return (
    <span
      style={{
        marginLeft: "0.5rem",
        padding: "2px 6px",
        fontSize: "0.75rem",
        borderRadius: "6px",
        backgroundColor: isFake ? "#ffcccc" : "#ccffcc",
        color: isFake ? "#900" : "#060"
      }}
    >
      {isFake ? "Suspicious" : "Verified"}
    </span>
  );
}

export default ReviewBadge;
