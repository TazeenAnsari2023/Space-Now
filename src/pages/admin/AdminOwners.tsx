import { useEffect, useState } from "react";
import { fetchAdminOwners, moderateAdminOwner, type AdminOwner } from "../../services/admin";

type OwnerFilter = "all" | "pending" | "verified" | "rejected";

function readStatus(owner: AdminOwner) {
  return owner.ownerVerificationStatus || "pending";
}

function AdminOwners() {
  const [owners, setOwners] = useState<AdminOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<OwnerFilter>("pending");
  const [actionId, setActionId] = useState("");

  const load = async (nextFilter: OwnerFilter) => {
    try {
      setLoading(true);
      setError("");
      const data = await fetchAdminOwners(nextFilter);
      setOwners(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load owners");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(filter);
  }, [filter]);

  const handleDecision = async (
    ownerId: string,
    decision: "verified" | "pending" | "rejected"
  ) => {
    try {
      setActionId(ownerId);
      await moderateAdminOwner(ownerId, decision);
      await load(filter);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed owner verification action");
    } finally {
      setActionId("");
    }
  };

  return (
    <section className="surface-card section" style={{ width: "100%", margin: 0 }}>
      <h1 className="page-title">Owner Verification</h1>
      <p className="page-subtitle">Approve or reject owners before they can manage listings.</p>

      <div className="row" style={{ gap: "0.6rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <button className={`btn ${filter === "pending" ? "btn-primary" : "btn-outline"}`} onClick={() => setFilter("pending")}>
          Pending
        </button>
        <button className={`btn ${filter === "verified" ? "btn-primary" : "btn-outline"}`} onClick={() => setFilter("verified")}>
          Verified
        </button>
        <button className={`btn ${filter === "rejected" ? "btn-primary" : "btn-outline"}`} onClick={() => setFilter("rejected")}>
          Rejected
        </button>
        <button className={`btn ${filter === "all" ? "btn-primary" : "btn-outline"}`} onClick={() => setFilter("all")}>
          All
        </button>
      </div>

      {loading && <p>Loading owners...</p>}
      {error && <p className="error-text">{error}</p>}

      {!loading && owners.length === 0 ? (
        <p>No owners found for this filter.</p>
      ) : (
        <div className="space-grid">
          {owners.map((owner) => (
            <article key={owner._id} className="surface-card space-card">
              <h3>{owner.name}</h3>
              <p style={{ margin: "0.2rem 0" }}>Email: {owner.email}</p>
              <p style={{ margin: "0.2rem 0" }}>Username: {owner.username}</p>
              <p style={{ margin: "0.2rem 0" }}>
                Location: {[owner.city, owner.state].filter(Boolean).join(", ")}
              </p>
              <p style={{ margin: "0.2rem 0" }}>Office: {owner.officeAddress || "N/A"}</p>
              <p style={{ margin: "0.2rem 0" }}>Office Number: {owner.officeNumber || "N/A"}</p>
              <p style={{ margin: "0.2rem 0" }}>Status: {readStatus(owner)}</p>

              <div className="row" style={{ flexWrap: "wrap", gap: "0.5rem" }}>
                <button
                  className="btn btn-primary"
                  disabled={actionId === owner._id}
                  onClick={() => void handleDecision(owner._id, "verified")}
                >
                  Verify Owner
                </button>
                <button
                  className="btn btn-outline"
                  disabled={actionId === owner._id}
                  onClick={() => void handleDecision(owner._id, "pending")}
                >
                  Mark Pending
                </button>
                <button
                  className="btn btn-danger"
                  disabled={actionId === owner._id}
                  onClick={() => void handleDecision(owner._id, "rejected")}
                >
                  Reject Owner
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default AdminOwners;
