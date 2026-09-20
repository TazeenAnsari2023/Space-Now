import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createSpace, fetchIndiaRegionsGeo, uploadSpacePhotos } from "../../services/api";


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


const parseCoordinateInput = (value: string, isLatitude: boolean) => {
  const normalized = value
    .trim()
    .toUpperCase()
    .replace(/[º°]/g, "°")
    .replace(/['’`]/g, "'")
    .replace(/[?“”]/g, '"')
    .replace(/\s+/g, " ");

  if (!normalized) {
    return Number.NaN;
  }

  const decimal = Number(normalized);
  if (!Number.isNaN(decimal)) {
    return decimal;
  }

  const directionMatch = normalized.match(/[NSEW]/);
  const direction = directionMatch?.[0];
  if (!direction) {
    return Number.NaN;
  }

  if (isLatitude && !["N", "S"].includes(direction)) {
    return Number.NaN;
  }

  if (!isLatitude && !["E", "W"].includes(direction)) {
    return Number.NaN;
  }

  const numericParts = normalized.match(/\d+(?:\.\d+)?/g);
  if (!numericParts || numericParts.length < 3) {
    return Number.NaN;
  }

  const degrees = Number(numericParts[0]);
  const minutes = Number(numericParts[1]);
  const seconds = Number(numericParts[2]);

  if (!Number.isFinite(degrees) || !Number.isFinite(minutes) || !Number.isFinite(seconds)) {
    return Number.NaN;
  }

  if (minutes < 0 || minutes >= 60 || seconds < 0 || seconds >= 60) {
    return Number.NaN;
  }

  let result = degrees + minutes / 60 + seconds / 3600;
  if (direction === "S" || direction === "W") {
    result *= -1;
  }

  return result;
};

function AddSpace() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    city: "",
    state: "",
    address: "",
    overview: "",
    pricePerMonth: "",
    availableSeats: "",
    latitude: "",
    longitude: "",
    servicedOffice: "",
    coworkingSpace: "",
    privateOffice: "",
    virtualOffice: ""
  });
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([
    "WiFi",
    "Air Conditioning",
    "Parking"
  ]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [regionData, setRegionData] = useState<Array<{ name: string; cities: Array<{ name: string }> }>>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);

  useEffect(() => {
    fetchIndiaRegionsGeo()
      .then((regions) => {
        setRegionData(
          regions.map((region) => ({
            name: region.name,
            cities: region.cities.map((city) => ({ name: city.name }))
          }))
        );
      })
      .catch(() => setRegionData([]));
  }, []);

  const stateOptions = useMemo(() => regionData.map((region) => region.name), [regionData]);

  const cityOptions = useMemo(() => {
    const matched = regionData.find((region) => region.name === form.state);
    return matched?.cities || [];
  }, [form.state, regionData]);

  const amenitiesPayload = useMemo(
    () => ({
      wifi: selectedAmenities.includes("WiFi"),
      ac: selectedAmenities.includes("Air Conditioning"),
      parking: selectedAmenities.includes("Parking") || selectedAmenities.includes("Bike Parking")
    }),
    [selectedAmenities]
  );

  const toggleAmenity = (item: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    );
  };

  const handleStateChange = (state: string) => {
    setForm((prev) => ({
      ...prev,
      state,
      city: "",
      latitude: "",
      longitude: ""
    }));
  };

  const handleCityChange = (cityName: string) => {
    setForm((prev) => ({
      ...prev,
      city: cityName
    }));
  };

  const handleUploadPhotos = async () => {
    if (!selectedFiles.length) {
      setError("Please choose photos to upload.");
      return;
    }

    setError("");

    try {
      setUploading(true);
      const urls = await uploadSpacePhotos(selectedFiles);
      setPhotoUrls((prev) => [...prev, ...urls]);
      setSelectedFiles([]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to upload photos";
      setError(`${message}. If Cloudinary was just configured, restart the server and try again.`);
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const latitude = parseCoordinateInput(form.latitude, true);
    const longitude = parseCoordinateInput(form.longitude, false);

    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      setError("Latitude must be valid. Example: 21deg 06min 54.7sec N or 21.14631");
      return;
    }

    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      setError("Longitude must be valid. Example: 79deg 05min 17.5sec E or 79.08820");
      return;
    }

    try {
      setLoading(true);
      await createSpace({
        name: form.name,
        city: form.city,
        state: form.state,
        address: form.address,
        overview: form.overview,
        pricePerMonth: Number(form.pricePerMonth),
        availableSeats: Number(form.availableSeats),
        latitude,
        longitude,
        amenityHighlights: selectedAmenities,
        photos: photoUrls,
        pricing: {
          servicedOffice: form.servicedOffice ? Number(form.servicedOffice) : undefined,
          coworkingSpace: form.coworkingSpace ? Number(form.coworkingSpace) : undefined,
          privateOffice: form.privateOffice ? Number(form.privateOffice) : undefined,
          virtualOffice: form.virtualOffice ? Number(form.virtualOffice) : undefined
        },
        amenities: amenitiesPayload
      });

      navigate("/owner/my-spaces");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create space");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="surface-card section" style={{ width: "100%", margin: 0 }}>
      <h1 className="page-title">Add Coworking Space</h1>
      <p className="page-subtitle">Upload real photos and choose amenities section-wise for a rich listing page.</p>

      <form onSubmit={submit} className="form-grid" style={{ maxWidth: 980 }}>
        <div className="owner-profile-grid">
          <label className="field">
            Space Name
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </label>

          <label className="field">
            State / Union Territory
            <select value={form.state} onChange={(e) => handleStateChange(e.target.value)} required>
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
              value={form.city}
              onChange={(e) => handleCityChange(e.target.value)}
              disabled={!form.state}
              required
            >
              <option value="">Select city</option>
              {cityOptions.map((city) => (
                <option key={`${form.state}-${city.name}`} value={city.name}>
                  {city.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field owner-span-2">
            Address
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              required
            />
          </label>

          <label className="field owner-span-2">
            Overview
            <textarea
              rows={4}
              value={form.overview}
              onChange={(e) => setForm({ ...form, overview: e.target.value })}
            />
          </label>

          <label className="field">
            Price per Month
            <input
              type="number"
              min="0"
              value={form.pricePerMonth}
              onChange={(e) => setForm({ ...form, pricePerMonth: e.target.value })}
              required
            />
          </label>

          <label className="field">
            Available Seats
            <input
              type="number"
              min="1"
              value={form.availableSeats}
              onChange={(e) => setForm({ ...form, availableSeats: e.target.value })}
              required
            />
          </label>

          <label className="field">
            Latitude
            <input
              type="text"
              placeholder={"21deg 06min 54.7sec N or 21.14631"}
              value={form.latitude}
              onChange={(e) => setForm({ ...form, latitude: e.target.value })}
              required
            />
          </label>

          <label className="field">
            Longitude
            <input
              type="text"
              placeholder={"79deg 05min 17.5sec E or 79.08820"}
              value={form.longitude}
              onChange={(e) => setForm({ ...form, longitude: e.target.value })}
              required
            />
          </label>

          <label className="field">
            Serviced Office Price
            <input
              type="number"
              min="0"
              value={form.servicedOffice}
              onChange={(e) => setForm({ ...form, servicedOffice: e.target.value })}
            />
          </label>

          <label className="field">
            Coworking Space Price
            <input
              type="number"
              min="0"
              value={form.coworkingSpace}
              onChange={(e) => setForm({ ...form, coworkingSpace: e.target.value })}
            />
          </label>

          <label className="field">
            Private Office Price
            <input
              type="number"
              min="0"
              value={form.privateOffice}
              onChange={(e) => setForm({ ...form, privateOffice: e.target.value })}
            />
          </label>

          <label className="field">
            Virtual Office Price
            <input
              type="number"
              min="0"
              value={form.virtualOffice}
              onChange={(e) => setForm({ ...form, virtualOffice: e.target.value })}
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
                      checked={selectedAmenities.includes(item)}
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
              accept="image/*"
              multiple
              onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
            />
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => void handleUploadPhotos()}
              disabled={uploading}
            >
              {uploading ? "Uploading..." : "Upload Selected Photos"}
            </button>
          </div>

          {!!photoUrls.length && (
            <div className="owner-uploaded-grid">
              {photoUrls.map((url) => (
                <div key={url} className="owner-uploaded-item">
                  <img src={url} alt="Uploaded" />
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => setPhotoUrls((prev) => prev.filter((x) => x !== url))}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {error && <p className="error-text">{error}</p>}

        <div className="row">
          <button className="btn btn-primary" type="submit" disabled={loading || uploading}>
            {loading ? "Saving..." : "Add Space"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default AddSpace;

