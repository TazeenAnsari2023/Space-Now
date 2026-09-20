import { useState } from "react";
import type { Space } from "../types/space";
import { isFavorite, toggleFavorite } from "../utils/favorites";

interface Props {
  space: Space;
}

function FavoriteButton({ space }: Props) {
  const [favorite, setFavorite] = useState<boolean>(
    isFavorite(space._id)
  );

  const handleClick = () => {
    toggleFavorite(space);
    setFavorite(!favorite);
  };

  return (
    <button
      onClick={handleClick}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        fontSize: "1.2rem"
      }}
      title="Add to favorites"
    >
      {favorite ? "❤️" : "🤍"}
    </button>
  );
}

export default FavoriteButton;
