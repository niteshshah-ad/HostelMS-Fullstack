import { Navigate } from "react-router-dom";

function ProtectedRoute({ children, allowedRole }) {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  // If not logged in
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // If role mismatch
  if (allowedRole && role !== allowedRole) {
    return <Navigate to="/home" replace />;
  }

  return children;
}

export default ProtectedRoute;
