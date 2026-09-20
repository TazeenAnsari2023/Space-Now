import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getUserRole, isAuthenticated, logout } from "../utils/auth";
import ThemeToggle from "./ThemeToggle";

function Navbar() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleDashboard = () => {
    const role = getUserRole();
    setMenuOpen(false);

    if (role === "owner") {
      navigate("/owner/dashboard");
      return;
    }

    if (role === "admin") {
      navigate("/admin/dashboard");
      return;
    }

    navigate("/user/dashboard");
  };

  useEffect(() => {
    const closeOnOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("click", closeOnOutside);
    return () => document.removeEventListener("click", closeOnOutside);
  }, []);

  return (
    <header className="topbar">
      <nav className="topbar-inner">
        <h2 className="brand">Space Now</h2>

        <div className="nav-links">
          <Link className="nav-link" to="/">
            Find Spaces
          </Link>
          <Link className="nav-link" to="/country/india">
            India Cities
          </Link>
          <Link className="nav-link" to="/about">
            About
          </Link>
          <Link className="nav-link" to="/how-it-works">
            How It Works
          </Link>

          <ThemeToggle />

          <div className="user-menu" ref={menuRef}>
            <button type="button" className="btn btn-outline" onClick={() => setMenuOpen((p) => !p)}>
              <span className="user-icon">User</span>
            </button>

            {menuOpen && (
              <div className="user-dropdown surface-card">
                {!isAuthenticated() ? (
                  <>
                    <Link to="/login" onClick={() => setMenuOpen(false)}>
                      Log In
                    </Link>
                    <Link to="/register" onClick={() => setMenuOpen(false)}>
                      Sign Up
                    </Link>
                  </>
                ) : (
                  <>
                    <button type="button" className="btn btn-outline" onClick={handleDashboard}>
                      Dashboard
                    </button>
                    <button type="button" className="btn btn-outline" onClick={handleLogout}>
                      Logout
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}

export default Navbar;
