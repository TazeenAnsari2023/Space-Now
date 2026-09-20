import { useEffect, useMemo, useState } from "react";
import {
  deleteAdminSpace,
  fetchAdminSpaces,
  moderateAdminSpace,
  type AdminSpace
} from "../../services/admin";

type SpaceFilter = "all" | "verified" | "pending" | "rejected";

function normalizeStatus(status?: string) {
  return status || "verified";
}

function AdminSpaces() {
  const [spaces, setSpaces] = useState<AdminSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<SpaceFilter>("all");
  const [actionId, setActionId] = useState<string>("");
  const [notesById, setNotesById] = useState<Record<string, string>>({});

  const load = async (nextFilter: SpaceFilter) => {
    try {
      setLoading(true);
      setError("");
      const data = await fetchAdminSpaces(nextFilter);
      setSpaces(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load spaces");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(filter);
  }, [filter]);

  const counters = useMemo(() => {
    return spaces.reduce(
      (acc, space) => {
        const status = normalizeStatus(space.verificationStatus) as SpaceFilter;
        acc[status] += 1;
        return acc;
      },
      { verified: 0, pending: 0, rejected: 0, all: spaces.length } as Record<SpaceFilter, number>
    );
  }, [spaces]);

  const handleDecision = async (
    spaceId: string,
    decision: "verified" | "pending" | "rejected"
  ) => {
    try {
      setActionId(spaceId);
      await moderateAdminSpace(spaceId, decision, notesById[spaceId]);
      await load(filter);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed moderation action");
    } finally {
      setActionId("");
    }
  };

  const handleDelete = async (spaceId: string) => {
    if (!window.confirm("Delete this space permanently?")) {
      return;
    }

    try {
      setActionId(spaceId);
      await deleteAdminSpace(spaceId);
      await load(filter);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete space");
    } finally {
      setActionId("");
    }
  };

  return (
    <section className="surface-card section" style={{ width: "100%", margin: 0 }}>
      <h1 className="page-title">Space Moderation</h1>
      <p className="page-subtitle">Approve, reject, or remove listings with location verification status.</p>

      <div className="row" style={{ gap: "0.6rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <button className={`btn ${filter === "all" ? "btn-primary" : "btn-outline"}`} onClick={() => setFilter("all")}>
          All ({counters.all})
        </button>
        <button className={`btn ${filter === "verified" ? "btn-primary" : "btn-outline"}`} onClick={() => setFilter("verified")}>
          Verified ({counters.verified})
        </button>
        <button className={`btn ${filter === "pending" ? "btn-primary" : "btn-outline"}`} onClick={() => setFilter("pending")}>
          Pending ({counters.pending})
        </button>
        <button className={`btn ${filter === "rejected" ? "btn-primary" : "btn-outline"}`} onClick={() => setFilter("rejected")}>
          Rejected ({counters.rejected})
        </button>
      </div>

      {loading && <p>Loading spaces...</p>}
      {error && <p className="error-text">{error}</p>}

      {!loading && spaces.length === 0 ? (
        <p>No spaces found for this filter.</p>
      ) : (
        <div className="space-grid">
          {spaces.map((space) => (
            <article key={space._id} className="surface-card space-card">
              <h3>{space.name}</h3>
              <p style={{ margin: "0.25rem 0" }}>
                {[space.city, space.state].filter(Boolean).join(", ") || "Unknown location"}
              </p>
              <p style={{ margin: "0.25rem 0" }}>Status: {normalizeStatus(space.verificationStatus)}</p>
              {space.verificationScore !== undefined && (
                <p style={{ margin: "0.25rem 0" }}>Verification score: {space.verificationScore}</p>
              )}
              {space.verificationNotes && <p style={{ margin: "0.25rem 0" }}>{space.verificationNotes}</p>}
              <textarea
                className="control-input"
                placeholder="Optional moderation notes"
                value={notesById[space._id] || ""}
                onChange={(e) =>
                  setNotesById((prev) => ({
                    ...prev,
                    [space._id]: e.target.value
                  }))
                }
              />
              <div className="row" style={{ flexWrap: "wrap", gap: "0.5rem" }}>
                <button
                  className="btn btn-primary"
                  disabled={actionId === space._id}
                  onClick={() => void handleDecision(space._id, "verified")}
                >
                  Verify
                </button>
                <button
                  className="btn btn-outline"
                  disabled={actionId === space._id}
                  onClick={() => void handleDecision(space._id, "pending")}
                >
                  Mark Pending
                </button>
                <button
                  className="btn btn-outline"
                  disabled={actionId === space._id}
                  onClick={() => void handleDecision(space._id, "rejected")}
                >
                  Reject
                </button>
                <button
                  className="btn btn-danger"
                  disabled={actionId === space._id}
                  onClick={() => void handleDelete(space._id)}
                >
                  Remove Space
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default AdminSpaces;
