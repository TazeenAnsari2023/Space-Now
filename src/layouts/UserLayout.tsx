import { useState } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";
import { logout } from "../utils/auth";

function UserLayout() {
  const navigate = useNavigate();
  const [manageOpen, setManageOpen] = useState(true);

  const handleUserLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="owner-shell">
      <aside className="owner-sidebar owner-sidebar-menu">
        <div className="row" style={{ justifyContent: "space-between", marginBottom: "0.8rem" }}>
          <h3 style={{ margin: 0 }}>User Panel</h3>
          <ThemeToggle />
        </div>

        <nav className="owner-nav owner-menu-list">
          <Link className="nav-link" to="/user/dashboard">
            Dashboard
          </Link>

          <button
            type="button"
            className="owner-menu-toggle"
            onClick={() => setManageOpen((prev) => !prev)}
          >
            Manage Space {manageOpen ? "[-]" : "[+]"}
          </button>

          {manageOpen && (
            <div className="owner-submenu">
              <Link className="nav-link" to="/user/search-space">
                Search Space
              </Link>
              <Link className="nav-link" to="/user/favorite-spaces">
                Favorite Spaces
              </Link>
              <Link className="nav-link" to="/user/your-spaces">
                Your Spaces
              </Link>
            </div>
          )}

          <Link className="nav-link" to="/user/settings?tab=notifications">
            Notifications
          </Link>

          <p className="owner-heading">General Setting</p>

          <Link className="nav-link" to="/user/settings?tab=profile">
            Profile
          </Link>
          <Link className="nav-link" to="/user/settings?tab=security">
            Security
          </Link>
          <Link className="nav-link" to="/user/settings?tab=help">
            Get Help
          </Link>
        </nav>

        <div style={{ marginTop: "auto", paddingTop: "1rem" }}>
          <button className="btn btn-danger" type="button" onClick={handleUserLogout}>
            Logout
          </button>
        </div>
      </aside>

      <main className="owner-main">
        <Outlet />
      </main>
    </div>
  );
}

export default UserLayout;

