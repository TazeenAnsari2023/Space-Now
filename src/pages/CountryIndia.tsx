import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchIndiaCityStats, type IndiaCityStat } from "../services/api";

function CountryIndia() {
  const [query, setQuery] = useState("");
  const [cities, setCities] = useState<IndiaCityStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const loadCities = async () => {
    try {
      const data = await fetchIndiaCityStats();
      setCities(data);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load city data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCities();
    const timer = setInterval(() => {
      void loadCities();
    }, 15000);

    return () => clearInterval(timer);
  }, []);

  const filtered = useMemo(() => {
    return cities.filter((city) => {
      const q = query.toLowerCase();
      return city.city.toLowerCase().includes(q) || city.state.toLowerCase().includes(q);
    });
  }, [cities, query]);

  if (loading) {
    return (
      <section className="section surface-card">
        <h2 className="page-title">Loading India city stats...</h2>
      </section>
    );
  }

  return (
    <section className="country-shell">
      <div className="country-hero surface-card">
        <p className="country-eyebrow">Country Workspace Guide</p>
        <h1 className="country-title">India Coworking Cities</h1>
        <p className="page-subtitle">
          Live backend data from MongoDB. Avg desk price and place counts update automatically.
        </p>

        <div className="country-stats">
          <div className="surface-card country-stat-card">
            <h3>{cities.length}</h3>
            <p>Total Cities</p>
          </div>
          <div className="surface-card country-stat-card">
            <h3>{cities.reduce((sum, city) => sum + city.spaces, 0)}</h3>
            <p>Total Places</p>
          </div>
          <div className="surface-card country-stat-card">
            <h3>
              {cities.length
                ? Math.round(
                    cities.reduce((sum, city) => sum + city.avgPrice, 0) / cities.length
                  )
                : 0}
            </h3>
            <p>Avg Desk Price</p>
          </div>
        </div>

        <div className="row">
          <input
            className="control-input country-search"
            placeholder="Search city or state"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="btn btn-outline" onClick={() => void loadCities()}>
            Refresh Now
          </button>
        </div>

        {error && <p className="error-text">{error}</p>}
      </div>

      {cities.length === 0 ? (
        <section className="section surface-card">
          <h3>No places available in database.</h3>
          <p className="page-subtitle">Add spaces first, then city cards will appear automatically.</p>
        </section>
      ) : (
        <div className="country-section">
          <h2>All Cities</h2>
          <div className="city-grid">
            {filtered.map((city) => (
              <article key={`${city.city}-${city.state}`} className="surface-card city-card">
                <h3>{city.city}</h3>
                <p>{city.state}</p>
                <p>Avg desk price: {Math.round(city.avgPrice)}/month</p>
                <p>Available places: {city.spaces}</p>
                <button
                  className="btn btn-primary"
                  onClick={() => navigate(`/?lat=${city.lat}&lng=${city.lng}&city=${encodeURIComponent(city.city)}`)}
                >
                  Explore {city.city}
                </button>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export default CountryIndia;
