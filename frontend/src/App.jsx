import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Channel from "./pages/Channel.jsx";
import Collections from "./pages/Collections.jsx";
import NicheExplorer from "./pages/NicheExplorer.jsx";
import CompetitorTracker from "./pages/CompetitorTracker.jsx";
import TitleGenerator from "./pages/TitleGenerator.jsx";
import FindOutliers from "./pages/FindOutliers.jsx";
import AppLayout from "./layouts/AppLayout";
import PublicLayout from "./layouts/PublicLayout";
import RequireAuth from "./components/RequireAuth";
import ResetPassword from "./pages/ResetPassword.jsx";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import "./styles/globals.css";

import { GoogleOAuthProvider } from "@react-oauth/google";

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function App() {
  return (
    <GoogleOAuthProvider clientId={clientId}>
      <Routes>
        {/* Public Layout */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
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
          <Route path="saved-videos" element={<Collections />} />
          <Route path="channel/:id" element={<Channel />} />
          <Route path="niche-explorer" element={<NicheExplorer />} />
          <Route path="competitor-tracker" element={<CompetitorTracker />} />
          <Route path="title-generator" element={<TitleGenerator />} />
          <Route path="find-outliers" element={<FindOutliers />} />
        </Route>
      </Routes>
    </GoogleOAuthProvider>
  );
}

export default App;
