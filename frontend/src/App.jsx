import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Saved from './pages/Saved.jsx';
import Channel from './pages/Channel.jsx';
import NicheExplorer from './pages/NicheExplorer.jsx';
import CompetitorTracker from './pages/CompetitorTracker.jsx';
import AppLayout from './layouts/AppLayout';
import PublicLayout from './layouts/PublicLayout';
import RequireAuth from './components/RequireAuth';
import ResetPassword from './pages/ResetPassword.jsx';
import './styles/globals.css';

import { GoogleOAuthProvider } from '@react-oauth/google';

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function App() {
  return (
    <GoogleOAuthProvider clientId={clientId}>
      <Routes>

        {/* Public Layout */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Route>

        {/* Authenticated App Layout */}
        <Route
          path="/app"
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="saved" element={<Saved />} />
          <Route path="channel/:id" element={<Channel />} />
          <Route path="niche-explorer" element={<NicheExplorer />} />
          <Route path="competitor-tracker" element={<CompetitorTracker />} />
        </Route>

      </Routes>
    </GoogleOAuthProvider>
  );
}

export default App;