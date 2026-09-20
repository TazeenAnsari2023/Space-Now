import { getFavorites } from "../utils/favorites";
import { Link } from "react-router-dom";

function Favorites() {
  const favorites = getFavorites();

  return (
    <section className="section surface-card">
      <h2 className="page-title">Your Favorite Coworking Spaces</h2>
      <p className="page-subtitle">Quick access to the spaces you care about most.</p>

      {favorites.length === 0 ? (
        <p>No favorites yet.</p>
      ) : (
        <div className="space-grid">
          {favorites.map((space) => (
            <article key={space._id} className="surface-card space-card">
              <h3>{space.name}</h3>
              <p>{space.pricePerMonth} / month</p>
              <Link to={`/space/${space._id}`}>View Details</Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default Favorites;
