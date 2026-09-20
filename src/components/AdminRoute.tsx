import { Navigate } from "react-router-dom";
import { getUserRole, isAuthenticated } from "../utils/auth";
import type { JSX } from "react/jsx-dev-runtime";

interface Props {
  children: JSX.Element;
}

function AdminRoute({ children }: Props) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (getUserRole() !== "admin") {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default AdminRoute;
