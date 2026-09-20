import { useEffect, useState } from "react";
import { fetchAdminStats, type AdminStats } from "../../services/admin";

function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await fetchAdminStats();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load admin stats");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  if (loading) {
    return <section className="surface-card section">Loading admin dashboard...</section>;
  }

  if (error || !stats) {
    return <section className="surface-card section">{error || "No stats found."}</section>;
  }

  return (
    <section className="surface-card section" style={{ width: "100%", margin: 0 }}>
      <h1 className="page-title">Admin Dashboard</h1>
      <p className="page-subtitle">Control moderation, verification, and platform health.</p>

      <div className="stat-grid">
        <article className="surface-card stat-card">
          <h3>Total Users</h3>
          <p>{stats.totalUsers}</p>
        </article>
        <article className="surface-card stat-card">
          <h3>Total Owners</h3>
          <p>{stats.totalOwners}</p>
        </article>
        <article className="surface-card stat-card">
          <h3>Pending Owners</h3>
          <p>{stats.pendingOwners}</p>
        </article>
        <article className="surface-card stat-card">
          <h3>Total Spaces</h3>
          <p>{stats.totalSpaces}</p>
        </article>
        <article className="surface-card stat-card">
          <h3>Pending Spaces</h3>
          <p>{stats.pendingSpaces}</p>
        </article>
        <article className="surface-card stat-card">
          <h3>Rejected Spaces</h3>
          <p>{stats.rejectedSpaces}</p>
        </article>
        <article className="surface-card stat-card">
          <h3>Total Reviews</h3>
          <p>{stats.totalReviews}</p>
        </article>
        <article className="surface-card stat-card">
          <h3>Flagged Fake Reviews</h3>
          <p>{stats.fakeReviews}</p>
        </article>
      </div>
    </section>
  );
}

export default AdminDashboard;
