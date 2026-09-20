import { Navigate } from "react-router-dom";
import { getUserRole, isAuthenticated } from "../utils/auth";
import type { JSX } from "react/jsx-dev-runtime";

interface Props {
  children: JSX.Element;
}

function UserRoute({ children }: Props) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (getUserRole() !== "user") {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default UserRoute;
