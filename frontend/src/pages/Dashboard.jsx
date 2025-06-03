import { useEffect } from 'react';
import { getMe } from '../api/auth';
import { useAuth } from '../context/AuthContext';

function Dashboard() {
  const { setUser } = useAuth();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");

    if (token) {
      localStorage.setItem("token", token);
      window.history.replaceState({}, document.title, window.location.pathname);

      getMe().then(res => setUser(res.data)).catch(err => {
        console.error("Failed to fetch user after login:", err);
      });
    }
  }, []);

  return (
    <div>
      {/* your dashboard content */}
    </div>
  );
}

export default Dashboard;