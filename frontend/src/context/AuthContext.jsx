import { createContext, useContext, useEffect, useState } from "react";
import { getMe, logout as logoutRequest } from "../api/apiRoutes.js";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const params = new URLSearchParams(window.location.search);
      if (params.get("token")) {
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname,
        );
      }

      try {
        const res = await getMe(); // Cookie gets sent automatically
        setUser(res.data);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const logoutUser = async () => {
    try {
      await logoutRequest(); // Clears the cookie on the backend
    } catch (err) {
      console.error("Logout failed:", err);
    }
    setUser(null);
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("streamline_")) {
        localStorage.removeItem(key);
      }
    });
    Object.keys(sessionStorage).forEach((key) => {
      if (key.startsWith("streamline_")) {
        sessionStorage.removeItem(key);
      }
    });
    navigate("/");
  };

  return (
    <AuthContext.Provider
      value={{ user, setUser, logout: logoutUser, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
};
