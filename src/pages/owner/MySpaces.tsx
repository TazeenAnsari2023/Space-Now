import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  deleteOwnerSpace,
  fetchIndiaRegionsGeo,
  fetchOwnerSpaces,
  updateOwnerSpace,
  uploadSpacePhotos
} from "../../services/api";
import type { Space } from "../../types/space";

const AMENITY_SECTIONS: Array<{ title: string; items: string[] }> = [
  {
    title: "Business Facilities",
    items: ["WiFi", "Printing", "Phone Booth", "Meeting Rooms", "Conference Rooms"]
  },
  {
    title: "Additional Facilities",
    items: ["Air Conditioning", "Personal Lockers", "Reception", "Power Backup"]
  },
  {
    title: "Freebies",
    items: ["Free Coffee", "Free Drinking Water", "Free Tea", "Snacks"]
  },
  {
    title: "Parking/Storage",
    items: ["Parking", "Bike Parking", "Storage Space"]
  },
  {
    title: "Community & Comfort",
    items: ["Community Events", "Lounge Area", "24x7 Access", "Security", "Housekeeping"]
  }
];

interface EditFormState {
  name: string;
  city: string;
  state: string;
  address: string;
  overview: string;
  pricePerMonth: string;
  availableSeats: string;
  selectedAmenities: string[];
  photos: string[];
  servicedOffice: string;
  coworkingSpace: string;
  privateOffice: string;
  virtualOffice: string;
}

function MySpaces() {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [editingFiles, setEditingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [regionData, setRegionData] = useState<Array<{ name: string; cities: Array<{ name: string }> }>>([]);

  const totalSeats = useMemo(
    () => spaces.reduce((sum, space) => sum + space.availableSeats, 0),
    [spaces]
  );

  const stateOptions = useMemo(() => regionData.map((region) => region.name), [regionData]);

  const editCityOptions = useMemo(() => {
    if (!editForm) {
      return [];
    }
    const matched = regionData.find((region) => region.name === editForm.state);
    return matched?.cities || [];
  }, [editForm, regionData]);

  const loadSpaces = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await fetchOwnerSpaces();
      setSpaces(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch spaces");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSpaces();
  }, []);

  useEffect(() => {
    fetchIndiaRegionsGeo()
      .then((regions) =>
        setRegionData(
          regions.map((region) => ({
            name: region.name,
            cities: region.cities.map((city) => ({ name: city.name }))
          }))
        )
      )
      .catch(() => setRegionData([]));
  }, []);

  const startEdit = (space: Space) => {
    setEditingId(space._id);
    setEditForm({
      name: space.name,
      city: space.city || "",
      state: space.state || "",
      address: space.address || "",
      overview: space.overview || "",
      pricePerMonth: String(space.pricePerMonth),
      availableSeats: String(space.availableSeats),
      selectedAmenities: space.amenityHighlights || [],
      photos: space.photos || [],
      servicedOffice: String(space.pricing?.servicedOffice || ""),
      coworkingSpace: String(space.pricing?.coworkingSpace || ""),
      privateOffice: String(space.pricing?.privateOffice || ""),
      virtualOffice: String(space.pricing?.virtualOffice || "")
    });
    setEditingFiles([]);
  };

  const toggleAmenity = (item: string) => {
    if (!editForm) return;

    setEditForm({
      ...editForm,
      selectedAmenities: editForm.selectedAmenities.includes(item)
        ? editForm.selectedAmenities.filter((x) => x !== item)
        : [...editForm.selectedAmenities, item]
    });
  };

  const handleEditStateChange = (state: string) => {
    if (!editForm) {
      return;
    }

    setEditForm({
      ...editForm,
      state,
      city: ""
    });
  };

  const uploadEditPhotos = async () => {
    if (!editForm || !editingFiles.length) {
      return;
    }

    try {
      setUploading(true);
      const urls = await uploadSpacePhotos(editingFiles);
      setEditForm({ ...editForm, photos: [...editForm.photos, ...urls] });
      setEditingFiles([]);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to upload photos");
    } finally {
      setUploading(false);
    }
  };

  const saveEdit = async (spaceId: string) => {
    if (!editForm) {
      return;
    }

    try {
      const amenities = {
        wifi: editForm.selectedAmenities.includes("WiFi"),
        ac: editForm.selectedAmenities.includes("Air Conditioning"),
        parking:
          editForm.selectedAmenities.includes("Parking") ||
          editForm.selectedAmenities.includes("Bike Parking")
      };

      const updated = await updateOwnerSpace(spaceId, {
        name: editForm.name,
        city: editForm.city,
        state: editForm.state,
        address: editForm.address,
        overview: editForm.overview,
        pricePerMonth: Number(editForm.pricePerMonth),
        availableSeats: Number(editForm.availableSeats),
        amenityHighlights: editForm.selectedAmenities,
        photos: editForm.photos,
        pricing: {
          servicedOffice: editForm.servicedOffice ? Number(editForm.servicedOffice) : undefined,
          coworkingSpace: editForm.coworkingSpace ? Number(editForm.coworkingSpace) : undefined,
          privateOffice: editForm.privateOffice ? Number(editForm.privateOffice) : undefined,
          virtualOffice: editForm.virtualOffice ? Number(editForm.virtualOffice) : undefined
        },
        amenities
      });

      setSpaces((prev) => prev.map((space) => (space._id === spaceId ? updated : space)));
      setEditingId(null);
      setEditForm(null);
      setEditingFiles([]);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update space");
    }
  };

  const removeSpace = async (spaceId: string) => {
    const confirmed = confirm("Delete this space permanently?");
    if (!confirmed) {
      return;
    }

    try {
      await deleteOwnerSpace(spaceId);
      setSpaces((prev) => prev.filter((space) => space._id !== spaceId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete space");
    }
  };

  if (loading) {
    return <p>Loading your spaces...</p>;
  }

  return (
    <section className="surface-card section" style={{ width: "100%", margin: 0 }}>
      <h1 className="page-title">My Coworking Spaces</h1>
      <p className="page-subtitle">
        {spaces.length} listing(s) | {totalSeats} available seat(s)
      </p>

      {error && <p className="error-text">{error}</p>}

      {spaces.length === 0 ? (
        <p>No spaces added yet.</p>
      ) : (
        <div className="space-grid">
          {spaces.map((space) => {
            const gallery =
              space.photos && space.photos.length
                ? space.photos
                : ["https://picsum.photos/seed/default-space/1200/800"];

            if (editingId === space._id && editForm) {
              return (
                <article key={space._id} className="surface-card space-card">
                  <div className="form-grid">
                    <div className="owner-profile-grid">
                      <label className="field">
                        Name
                        <input
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        />
                      </label>

                      <label className="field">
                        State / Union Territory
                        <select
                          value={editForm.state}
                          onChange={(e) => handleEditStateChange(e.target.value)}
                        >
                          <option value="">Select state or union territory</option>
                          {stateOptions.map((state) => (
                            <option key={state} value={state}>
                              {state}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="field">
                        City
                        <select
                          value={editForm.city}
                          onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                          disabled={!editForm.state}
                        >
                          <option value="">Select city</option>
                          {editCityOptions.map((city) => (
                            <option key={`${editForm.state}-${city.name}`} value={city.name}>
                              {city.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="field">
                        Base Price
                        <input
                          type="number"
                          value={editForm.pricePerMonth}
                          onChange={(e) => setEditForm({ ...editForm, pricePerMonth: e.target.value })}
                        />
                      </label>

                      <label className="field">
                        Seats
                        <input
                          type="number"
                          value={editForm.availableSeats}
                          onChange={(e) => setEditForm({ ...editForm, availableSeats: e.target.value })}
                        />
                      </label>

                      <label className="field owner-span-2">
                        Address
                        <input
                          value={editForm.address}
                          onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                        />
                      </label>

                      <label className="field owner-span-2">
                        Overview
                        <textarea
                          rows={3}
                          value={editForm.overview}
                          onChange={(e) => setEditForm({ ...editForm, overview: e.target.value })}
                        />
                      </label>
                    </div>

                    <section className="surface-card amenity-section-wrap" style={{ padding: "1rem" }}>
                      <h3 style={{ marginTop: 0 }}>Amenities</h3>
                      {AMENITY_SECTIONS.map((section) => (
                        <div key={section.title} className="amenity-form-section">
                          <h4>{section.title}</h4>
                          <div className="amenity-checkbox-grid">
                            {section.items.map((item) => (
                              <label key={item} className="amenity-checkbox-item">
                                <input
                                  type="checkbox"
                                  checked={editForm.selectedAmenities.includes(item)}
                                  onChange={() => toggleAmenity(item)}
                                />
                                <span>{item}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </section>

                    <section className="surface-card" style={{ padding: "1rem" }}>
                      <h3 style={{ marginTop: 0 }}>Office photos</h3>
                      <div className="row">
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={(e) => setEditingFiles(Array.from(e.target.files || []))}
                        />
                        <button
                          type="button"
                          className="btn btn-outline"
                          onClick={() => void uploadEditPhotos()}
                          disabled={uploading}
                        >
                          {uploading ? "Uploading..." : "Upload Selected Photos"}
                        </button>
                      </div>

                      {!!editForm.photos.length && (
                        <div className="owner-uploaded-grid">
                          {editForm.photos.map((url) => (
                            <div key={url} className="owner-uploaded-item">
                              <img src={url} alt="Uploaded" />
                              <button
                                type="button"
                                className="btn btn-danger"
                                onClick={() =>
                                  setEditForm({
                                    ...editForm,
                                    photos: editForm.photos.filter((x) => x !== url)
                                  })
                                }
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>

                    <div className="row">
                      <button className="btn btn-primary" onClick={() => void saveEdit(space._id)}>
                        Save
                      </button>
                      <button
                        className="btn btn-outline"
                        onClick={() => {
                          setEditingId(null);
                          setEditForm(null);
                          setEditingFiles([]);
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </article>
              );
            }

            return (
              <article key={space._id} className="surface-card space-card">
                <div className="space-gallery" style={{ marginBottom: "0.7rem" }}>
                  <img className="space-main-photo" src={gallery[0]} alt={space.name} style={{ height: 230 }} />
                  <div className="space-thumb-grid">
                    {gallery.slice(1, 5).map((photo, idx) => (
                      <img key={idx} src={photo} alt={`${space.name}-${idx + 2}`} style={{ height: 110 }} />
                    ))}
                  </div>
                </div>

                <h3 style={{ marginBottom: "0.3rem" }}>{space.name}</h3>
                <p className="page-subtitle" style={{ margin: "0 0 0.5rem" }}>
                  {space.city}, {space.state}
                </p>

                <p style={{ margin: "0.25rem 0" }}>
                  <strong>Address:</strong> {space.address || "-"}
                </p>
                <p style={{ margin: "0.25rem 0" }}>
                  <strong>Overview:</strong> {space.overview || "-"}
                </p>

                <div className="amenity-grid">
                  {(space.amenityHighlights || ["WiFi", "Air Conditioning", "Parking"]).map((item) => (
                    <span key={item} className="amenity-pill">
                      {item}
                    </span>
                  ))}
                </div>

                <div className="pricing-grid" style={{ marginBottom: "0.8rem" }}>
                  <article className="surface-card pricing-card">
                    <h4>Serviced</h4>
                    <p>{space.pricing?.servicedOffice || space.pricePerMonth + 12000}</p>
                  </article>
                  <article className="surface-card pricing-card">
                    <h4>Coworking</h4>
                    <p>{space.pricing?.coworkingSpace || space.pricePerMonth}</p>
                  </article>
                  <article className="surface-card pricing-card">
                    <h4>Private</h4>
                    <p>{space.pricing?.privateOffice || space.pricePerMonth + 7000}</p>
                  </article>
                </div>

                <p style={{ margin: "0.25rem 0" }}>Base Price: Rs {space.pricePerMonth}/month</p>
                <p style={{ margin: "0.25rem 0" }}>Available Seats: {space.availableSeats}</p>

                <div className="row">
                  <Link to={`/space/${space._id}`} className="btn btn-primary">
                    View Place
                  </Link>
                  <button className="btn btn-outline" onClick={() => startEdit(space)}>
                    Edit Details
                  </button>
                  <button className="btn btn-danger" onClick={() => void removeSpace(space._id)}>
                    Delete
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default MySpaces;


