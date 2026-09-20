import { fetchMyProfile } from "../../services/auth";
import { useEffect, useState } from "react";

interface OwnerProfile {
  name: string;
  email: string;
  username: string;
  mobile: string;
  city: string;
  state: string;
  role: string;
  officeAddress?: string;
  officeNumber?: string;
}

function OwnerProfile() {
  const [profile, setProfile] = useState<OwnerProfile | null>(null);

  useEffect(() => {
    fetchMyProfile().then(setProfile).catch(() => setProfile(null));
  }, []);

  return (
    <section className="surface-card section" style={{ width: "100%", margin: 0 }}>
      <h1 className="page-title">Profile</h1>
      <p className="page-subtitle">Your personal and business information.</p>

      {!profile ? (
        <p>Profile data unavailable.</p>
      ) : (
        <div className="profile-grid">
          <p><strong>Name:</strong> {profile.name}</p>
          <p><strong>Email:</strong> {profile.email}</p>
          <p><strong>Username:</strong> {profile.username}</p>
          <p><strong>Mobile:</strong> {profile.mobile}</p>
          <p><strong>City:</strong> {profile.city}</p>
          <p><strong>State:</strong> {profile.state}</p>
          <p><strong>Role:</strong> {profile.role}</p>
          <p><strong>Office Address:</strong> {profile.officeAddress || "-"}</p>
          <p><strong>Office Number:</strong> {profile.officeNumber || "-"}</p>
        </div>
      )}
    </section>
  );
}

export default OwnerProfile;
