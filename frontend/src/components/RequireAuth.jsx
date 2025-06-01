import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

const RequireAuth = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return null; // or a loading spinner
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

export default RequireAuth;