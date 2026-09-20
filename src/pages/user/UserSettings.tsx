import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchMyNotifications, markNotificationRead, type AppNotification } from "../../services/api";
import {
  checkUsername,
  fetchMyProfile,
  type MyProfile,
  updateMyProfile,
  updateMySecurity,
  type UpdateProfilePayload
} from "../../services/auth";
import { formatMembershipPlan, getUserMemberships } from "../../utils/memberships";

type TabKey = "profile" | "security" | "notifications" | "help";

interface ProfileFormState {
  name: string;
  email: string;
  role: string;
  username: string;
  mobile: string;
  city: string;
  state: string;
  gender: "" | "male" | "female" | "other" | "prefer_not_to_say";
  dob: string;
  bio: string;
  addressLine: string;
  country: string;
  postalCode: string;
}

interface SecurityFormState {
  newMobile: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const TABS: Array<{ key: Exclude<TabKey, "notifications">; label: string }> = [
  { key: "profile", label: "Profile" },
  { key: "security", label: "Security" },
  { key: "help", label: "Get Help" }
];

function toProfileForm(profile: MyProfile): ProfileFormState {
  return {
    name: profile.name || "",
    email: profile.email || "",
    role: profile.role || "",
    username: profile.username || "",
    mobile: profile.mobile || "",
    city: profile.city || "",
    state: profile.state || "",
    gender: profile.gender || "",
    dob: profile.dob ? String(profile.dob).slice(0, 10) : "",
    bio: profile.bio || "",
    addressLine: profile.addressLine || "",
    country: profile.country || "",
    postalCode: profile.postalCode || ""
  };
}

function UserSettings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryTab = searchParams.get("tab") as TabKey | null;
  const validTabs: TabKey[] = ["profile", "security", "notifications", "help"];
  const activeTab: TabKey = validTabs.includes((queryTab || "") as TabKey)
    ? (queryTab as TabKey)
    : "profile";

  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [profileForm, setProfileForm] = useState<ProfileFormState | null>(null);
  const [profileMessage, setProfileMessage] = useState<string>("");
  const [profileError, setProfileError] = useState<string>("");
  const [usernameHint, setUsernameHint] = useState<string>("");
  const [isUsernameTaken, setIsUsernameTaken] = useState<boolean>(false);

  const [securityForm, setSecurityForm] = useState<SecurityFormState>({
    newMobile: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [securityMessage, setSecurityMessage] = useState<string>("");
  const [securityError, setSecurityError] = useState<string>("");
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notificationsError, setNotificationsError] = useState<string>("");
  const [notificationActionId, setNotificationActionId] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      try {
        const me = await fetchMyProfile();
        setProfile(me);
        setProfileForm(toProfileForm(me));
        setSecurityForm((prev) => ({ ...prev, newMobile: me.mobile || "" }));
      } catch (error) {
        setProfileError((error as Error).message || "Failed to load profile");
      }
    };

    load();
  }, []);

  const refreshNotifications = async () => {
    try {
      const items = await fetchMyNotifications();
      setNotifications(items);
      setNotificationsError("");
    } catch (error) {
      setNotifications([]);
      setNotificationsError((error as Error).message || "Failed to fetch notifications");
    }
  };

  useEffect(() => {
    if (activeTab !== "notifications") {
      return;
    }

    void refreshNotifications();
  }, [activeTab]);

  useEffect(() => {
    if (!profileForm || !profile) {
      return;
    }

    const username = profileForm.username.trim().toLowerCase();
    const currentUsername = profile.username.trim().toLowerCase();

    if (!username) {
      setUsernameHint("");
      setIsUsernameTaken(false);
      return;
    }

    if (username.length < 3) {
      setUsernameHint("Username must be at least 3 characters.");
      setIsUsernameTaken(true);
      return;
    }

    if (username === currentUsername) {
      setUsernameHint("");
      setIsUsernameTaken(false);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        const result = await checkUsername({ username });
        if (result.available) {
          setUsernameHint("Username is available.");
          setIsUsernameTaken(false);
        } else {
          setUsernameHint("Username already taken.");
          setIsUsernameTaken(true);
        }
      } catch {
        setUsernameHint("Could not verify username right now.");
        setIsUsernameTaken(false);
      }
    }, 350);

    return () => clearTimeout(timeout);
  }, [profileForm?.username, profile]);

  const initialSnapshot = useMemo(() => {
    return profile ? toProfileForm(profile) : null;
  }, [profile]);

  const dueSoonReminders = useMemo(() => {
    const now = new Date();
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;

    return getUserMemberships()
      .filter((item) => item.status === "active")
      .map((item) => {
        const dueDate = new Date(item.nextBillingDate);
        const diff = dueDate.getTime() - now.getTime();
        return {
          ...item,
          diff
        };
      })
      .filter((item) => item.diff >= 0 && item.diff <= threeDaysMs)
      .sort((a, b) => a.diff - b.diff);
  }, [activeTab]);

  const onTabChange = (tab: Exclude<TabKey, "notifications">) => {
    setSearchParams({ tab });
  };

  const onSubmitProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!profileForm || !initialSnapshot) {
      return;
    }

    if (isUsernameTaken) {
      setProfileError("Username already taken.");
      return;
    }

    setProfileMessage("");
    setProfileError("");

    const payload: UpdateProfilePayload = {
      name: profileForm.name,
      username: profileForm.username,
      mobile: profileForm.mobile,
      city: profileForm.city,
      state: profileForm.state,
      gender: profileForm.gender,
      dob: profileForm.dob,
      bio: profileForm.bio,
      addressLine: profileForm.addressLine,
      country: profileForm.country,
      postalCode: profileForm.postalCode
    };

    try {
      const response = await updateMyProfile(payload);
      const updatedUser = response.user as MyProfile;
      setProfile(updatedUser);
      setProfileForm(toProfileForm(updatedUser));
      setSecurityForm((prev) => ({ ...prev, newMobile: updatedUser.mobile || "" }));
      setProfileMessage("Profile updated successfully.");
      setUsernameHint("");
      setIsUsernameTaken(false);
    } catch (error) {
      setProfileError((error as Error).message || "Unable to save profile");
    }
  };

  const onSubmitSecurity = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSecurityMessage("");
    setSecurityError("");

    const payload: { currentPassword?: string; newPassword?: string; newMobile?: string } = {};

    if (securityForm.newMobile.trim()) {
      payload.newMobile = securityForm.newMobile.trim();
    }

    if (securityForm.newPassword || securityForm.confirmPassword || securityForm.currentPassword) {
      if (!securityForm.currentPassword) {
        setSecurityError("Current password is required to set a new password.");
        return;
      }

      if (securityForm.newPassword !== securityForm.confirmPassword) {
        setSecurityError("New password and confirm password do not match.");
        return;
      }

      payload.currentPassword = securityForm.currentPassword;
      payload.newPassword = securityForm.newPassword;
    }

    if (!payload.newPassword && !payload.newMobile) {
      setSecurityError("Please change mobile or password before saving.");
      return;
    }

    try {
      const response = await updateMySecurity(payload);
      const updatedUser = response.user as MyProfile;
      setProfile(updatedUser);
      setProfileForm((prev) => (prev ? { ...prev, mobile: updatedUser.mobile || "" } : prev));
      setSecurityForm({
        newMobile: updatedUser.mobile || "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
      setSecurityMessage("Security settings updated successfully.");
    } catch (error) {
      setSecurityError((error as Error).message || "Unable to save security settings");
    }
  };

  const handleMarkNotificationRead = async (notificationId: string) => {
    try {
      setNotificationActionId(notificationId);
      await markNotificationRead(notificationId);
      await refreshNotifications();
    } catch (error) {
      setNotificationsError((error as Error).message || "Failed to mark notification as read");
    } finally {
      setNotificationActionId("");
    }
  };
  const renderNotifications = () => (
    <div>
      <h1 className="page-title">Notifications</h1>
      <p className="page-subtitle">Updates for your quotes, tours and upcoming payments.</p>

      {notificationsError && <p className="error-text">{notificationsError}</p>}

      {!!dueSoonReminders.length && (
        <div className="owner-notification-list" style={{ marginBottom: "1rem" }}>
          {dueSoonReminders.map((item) => (
            <article key={`${item.spaceId}-payment-reminder`} className="surface-card owner-notification-card">
              <h3>Payment due soon</h3>
              <p>
                Your {formatMembershipPlan(item.plan)} membership for {item.spaceName} is due on {new Date(item.nextBillingDate).toLocaleDateString()}.
              </p>
              <small>Monthly price: Rs {item.monthlyPrice}</small>
            </article>
          ))}
        </div>
      )}

      {!notifications.length ? (
        <div className="surface-card" style={{ padding: "1rem", borderRadius: "12px" }}>
          No notifications right now.
        </div>
      ) : (
        <div className="owner-notification-list">
          {notifications.map((notification) => (
            <article key={notification.id} className="surface-card owner-notification-card">
              <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h3>{notification.title}</h3>
                  <p>{notification.message}</p>
                  <small>{new Date(notification.createdAt).toLocaleString()}</small>
                  {notification.actionStatus && (
                    <p style={{ margin: "0.5rem 0 0", fontWeight: 600 }}>
                      Status: {notification.actionStatus}
                    </p>
                  )}
                </div>
                {!notification.read && (
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => void handleMarkNotificationRead(notification.id)}
                    disabled={notificationActionId === notification.id}
                  >
                    Mark as Read
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );

  if (!profileForm) {
    return (
      <section className="surface-card section" style={{ width: "100%", margin: 0 }}>
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Loading your settings...</p>
        {profileError && <p className="error-text">{profileError}</p>}
      </section>
    );
  }

  if (activeTab === "notifications") {
    return (
      <section className="surface-card section" style={{ width: "100%", margin: 0 }}>
        {renderNotifications()}
      </section>
    );
  }

  return (
    <section className="owner-settings-shell">
      <aside className="surface-card owner-settings-nav">
        <h2>Settings</h2>
        <p className="page-subtitle">Manage your profile, security and account updates.</p>

        <div className="owner-settings-links">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`owner-settings-tab ${activeTab === tab.key ? "active" : ""}`}
              onClick={() => onTabChange(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </aside>

      <div className="surface-card owner-settings-content">
        {activeTab === "profile" && (
          <form className="form-grid" onSubmit={onSubmitProfile}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <h1 className="page-title" style={{ marginBottom: 0 }}>Profile Information</h1>
              <button className="btn btn-primary" type="submit">Save Profile</button>
            </div>

            <div className="owner-profile-grid">
              <label className="field">
                <span>Full Name</span>
                <input
                  value={profileForm.name}
                  onChange={(e) => setProfileForm((prev) => prev ? { ...prev, name: e.target.value } : prev)}
                  required
                />
              </label>

              <label className="field">
                <span>Email (locked)</span>
                <input value={profileForm.email} disabled />
              </label>

              <label className="field">
                <span>Role (locked)</span>
                <input value={profileForm.role} disabled />
              </label>

              <label className="field">
                <span>Username</span>
                <input
                  value={profileForm.username}
                  onChange={(e) => {
                    const nextUsername = e.target.value;
                    setProfileError("");
                    setProfileMessage("");
                    setProfileForm((prev) => prev ? { ...prev, username: nextUsername } : prev);
                  }}
                  required
                />
                {usernameHint && (
                  <small style={{ color: isUsernameTaken ? "#b42318" : "#15803d" }}>{usernameHint}</small>
                )}
              </label>

              <label className="field">
                <span>Mobile</span>
                <input
                  value={profileForm.mobile}
                  onChange={(e) => setProfileForm((prev) => prev ? { ...prev, mobile: e.target.value } : prev)}
                  required
                />
              </label>

              <label className="field">
                <span>Gender</span>
                <select
                  value={profileForm.gender}
                  onChange={(e) =>
                    setProfileForm((prev) =>
                      prev
                        ? {
                            ...prev,
                            gender: e.target.value as "" | "male" | "female" | "other" | "prefer_not_to_say"
                          }
                        : prev
                    )
                  }
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </label>

              <label className="field">
                <span>Date of Birth</span>
                <input
                  type="date"
                  value={profileForm.dob}
                  onChange={(e) => setProfileForm((prev) => prev ? { ...prev, dob: e.target.value } : prev)}
                />
              </label>

              <label className="field">
                <span>City</span>
                <input
                  value={profileForm.city}
                  onChange={(e) => setProfileForm((prev) => prev ? { ...prev, city: e.target.value } : prev)}
                  required
                />
              </label>

              <label className="field">
                <span>State</span>
                <input
                  value={profileForm.state}
                  onChange={(e) => setProfileForm((prev) => prev ? { ...prev, state: e.target.value } : prev)}
                  required
                />
              </label>

              <label className="field">
                <span>Country</span>
                <input
                  value={profileForm.country}
                  onChange={(e) => setProfileForm((prev) => prev ? { ...prev, country: e.target.value } : prev)}
                />
              </label>

              <label className="field">
                <span>Postal Code</span>
                <input
                  value={profileForm.postalCode}
                  onChange={(e) => setProfileForm((prev) => prev ? { ...prev, postalCode: e.target.value } : prev)}
                />
              </label>

              <label className="field owner-span-2">
                <span>Address</span>
                <input
                  value={profileForm.addressLine}
                  onChange={(e) => setProfileForm((prev) => prev ? { ...prev, addressLine: e.target.value } : prev)}
                />
              </label>

              <label className="field owner-span-2">
                <span>Bio</span>
                <textarea
                  rows={3}
                  value={profileForm.bio}
                  onChange={(e) => setProfileForm((prev) => prev ? { ...prev, bio: e.target.value } : prev)}
                />
              </label>
            </div>

            {profileMessage && <p style={{ color: "#15803d", margin: 0 }}>{profileMessage}</p>}
            {profileError && <p className="error-text">{profileError}</p>}
          </form>
        )}

        {activeTab === "security" && (
          <form className="form-grid" onSubmit={onSubmitSecurity}>
            <h1 className="page-title" style={{ marginBottom: 0 }}>Security</h1>
            <p className="page-subtitle" style={{ marginBottom: "0.5rem" }}>
              Update your mobile number and password securely.
            </p>

            <label className="field">
              <span>Mobile Number</span>
              <input
                value={securityForm.newMobile}
                onChange={(e) => setSecurityForm((prev) => ({ ...prev, newMobile: e.target.value }))}
              />
            </label>

            <label className="field">
              <span>Current Password</span>
              <input
                type="password"
                value={securityForm.currentPassword}
                onChange={(e) => setSecurityForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                placeholder="Required if changing password"
              />
            </label>

            <label className="field">
              <span>New Password</span>
              <input
                type="password"
                value={securityForm.newPassword}
                onChange={(e) => setSecurityForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                placeholder="8+ chars with A-Z, a-z, number, special"
              />
            </label>

            <label className="field">
              <span>Confirm New Password</span>
              <input
                type="password"
                value={securityForm.confirmPassword}
                onChange={(e) => setSecurityForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
              />
            </label>

            <div className="row">
              <button className="btn btn-primary" type="submit">Save Security Changes</button>
            </div>

            {securityMessage && <p style={{ color: "#15803d", margin: 0 }}>{securityMessage}</p>}
            {securityError && <p className="error-text">{securityError}</p>}
          </form>
        )}

        {activeTab === "help" && (
          <div>
            <h1 className="page-title">Get Help</h1>
            <p className="page-subtitle">Support guidance for searching, saving and managing memberships.</p>

            <div className="owner-help-list">
              <article className="surface-card owner-help-item">
                <h3>How do I search spaces?</h3>
                <p>Open Search Space, filter by price and location, then explore available listings on the map.</p>
              </article>

              <article className="surface-card owner-help-item">
                <h3>How do I save favorites?</h3>
                <p>Use Add Favorite in Search Space. Your wishlist appears under Favorite Spaces.</p>
              </article>

              <article className="surface-card owner-help-item">
                <h3>How can I manage my membership?</h3>
                <p>Go to Your Spaces to pay billing, pause/resume, or cancel your selected spaces.</p>
              </article>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default UserSettings;




