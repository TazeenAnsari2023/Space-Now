import { Link } from "react-router-dom";
import { getFavorites, toggleFavorite } from "../../utils/favorites";
import { useState } from "react";

function UserFavoriteSpaces() {
  const [favorites, setFavorites] = useState(getFavorites());

  const removeFavorite = (spaceId: string) => {
    const target = favorites.find((item) => item._id === spaceId);
    if (!target) {
      return;
    }

    const updated = toggleFavorite(target);
    setFavorites(updated);
  };

  return (
    <section className="surface-card section" style={{ width: "100%", margin: 0 }}>
      <h1 className="page-title">Favorite Spaces</h1>
      <p className="page-subtitle">Your wishlist of coworking spaces.</p>

      {favorites.length === 0 ? (
        <p>No favorite spaces yet.</p>
      ) : (
        <div className="space-grid">
          {favorites.map((space) => (
            <article key={space._id} className="surface-card space-card">
              <h3>{space.name}</h3>
              <p>Rs {space.pricePerMonth}/month</p>
              <div className="row">
                <Link to={`/space/${space._id}`}>View Details</Link>
                <button className="btn btn-outline" onClick={() => removeFavorite(space._id)}>
                  Remove
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default UserFavoriteSpaces;
