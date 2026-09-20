import { Link, Outlet, useNavigate } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";
import { logout } from "../utils/auth";

function AdminLayout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="owner-shell">
      <aside className="owner-sidebar owner-sidebar-menu">
        <div className="row" style={{ justifyContent: "space-between", marginBottom: "0.8rem" }}>
          <h3 style={{ margin: 0 }}>Admin Panel</h3>
          <ThemeToggle />
        </div>

        <nav className="owner-nav owner-menu-list">
          <Link className="nav-link" to="/admin/dashboard">
            Dashboard
          </Link>
          <Link className="nav-link" to="/admin/spaces">
            Space Moderation
          </Link>
          <Link className="nav-link" to="/admin/reviews">
            Review Moderation
          </Link>
          <Link className="nav-link" to="/admin/owners">
            Owner Verification
          </Link>
        </nav>

        <div style={{ marginTop: "auto", paddingTop: "1rem" }}>
          <button className="btn btn-danger" type="button" onClick={handleLogout}>
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

export default AdminLayout;
