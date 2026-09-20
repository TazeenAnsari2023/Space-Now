import { Navigate } from "react-router-dom";
import { isAuthenticated, getUserRole } from "../utils/auth";
import type { JSX } from "react/jsx-dev-runtime";

interface Props {
  children: JSX.Element;
}

function OwnerRoute({ children }: Props) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (getUserRole() !== "owner") {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default OwnerRoute;
