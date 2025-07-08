import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";

const RequireAuth = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/" replace />;
  return children;
};

export default RequireAuth;
