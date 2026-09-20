import { useMemo } from "react";
import { getFavorites } from "../../utils/favorites";
import { getUserMemberships } from "../../utils/memberships";

function UserDashboard() {
  const favorites = getFavorites();
  const memberships = getUserMemberships();

  const totalMonthlyCommitment = useMemo(
    () => memberships.reduce((sum, item) => sum + item.monthlyPrice, 0),
    [memberships]
  );

  const activeMemberships = memberships.filter((item) => item.status === "active").length;

  return (
    <section className="surface-card section" style={{ width: "100%", margin: 0 }}>
      <h1 className="page-title">Dashboard</h1>
      <p className="page-subtitle">Track your searched, favorite and subscribed spaces.</p>

      <div className="stat-grid">
        <article className="surface-card stat-card">
          <h3>Favorite Spaces</h3>
          <p>{favorites.length}</p>
        </article>

        <article className="surface-card stat-card">
          <h3>Active Memberships</h3>
          <p>{activeMemberships}</p>
        </article>

        <article className="surface-card stat-card">
          <h3>Monthly Commitment</h3>
          <p>Rs {totalMonthlyCommitment}</p>
        </article>
      </div>
    </section>
  );
}

export default UserDashboard;
