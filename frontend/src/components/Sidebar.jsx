import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiGrid,
  FiUsers,
  FiType,
  FiBookmark,
  FiTv,
  FiTrendingUp,
  FiSearch,
} from "react-icons/fi";
import "../styles/sidebar.css";
import Modal from "./Modal";
import ChannelCard from "./ChannelCard.jsx";
import { searchYoutubeChannels } from "../api/apiRoutes.js";

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchErrors, setSearchErrors] = useState({});
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [showLookupModal, setShowLookupModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 1400);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const closeModal = () => {
    setShowLookupModal(false);
    setSearchQuery("");
    setSearchResults([]);
    setSearchErrors({});
    setSearchPerformed(false); // Reset state when modal closes
  };

  return (
    <>
      <aside
        className={`sidebar ${isMobile ? "mobile" : ""} ${isOpen ? "open" : ""}`}
      >
        <div className="sidebar-group">
          <div className="sidebar-heading">My Workspace</div>
          <Link to="/app/dashboard" className="sidebar-button">
            <FiGrid className="sidebar-icon" />
            Dashboard
          </Link>
          <Link to="/app/niche-explorer" className="sidebar-button">
            <FiTv className="sidebar-icon" />
            Niche Explorer
          </Link>
          <Link to="/app/competitor-tracker" className="sidebar-button">
            <FiUsers className="sidebar-icon" />
            Competitor Tracker
          </Link>
          <Link to="/app/find-outliers" className="sidebar-button">
            <FiTrendingUp className="sidebar-icon" />
            Find Outliers
          </Link>
          <Link to="/app/saved-videos" className="sidebar-button">
            <FiBookmark className="sidebar-icon" />
            Saved Videos
          </Link>
        </div>

        <div className="sidebar-group">
          <div className="sidebar-heading">Tools</div>
          <div
            className="sidebar-button"
            onClick={() => setShowLookupModal(true)}
          >
            <FiSearch className="sidebar-icon" />
            Channel Lookup
          </div>
          <Link to="/app/title-generator" className="sidebar-button">
            <FiType className="sidebar-icon" />
            Title Generator
          </Link>
        </div>
      </aside>
      {isMobile && isOpen && (
        <div className="sidebar-backdrop" onClick={toggleSidebar} />
      )}
      {showLookupModal && (
        <Modal
          isOpen={showLookupModal}
          onClose={closeModal}
          title="Search Channel"
          fields={[]}
          formData={{}}
          onChange={() => {}}
          onSubmit={async (e) => {
            e.preventDefault();
            if (searchLoading) return;
            setSearchLoading(true);
            setSearchErrors({});
            setSearchPerformed(true); // Mark search as performed
            try {
              const res = await searchYoutubeChannels(searchQuery);
              setSearchResults(res.results || []);
            } catch (err) {
              setSearchErrors({ form: "Search failed. Try again." });
            } finally {
              setSearchLoading(false);
            }
          }}
          errors={searchErrors}
          loading={searchLoading}
          submitLabel="Search"
          actions={
            searchResults.length > 0 ? (
              <div className="search-results">
                {searchResults.map((ch) => (
                  <ChannelCard
                    key={ch.channelId}
                    avatar={ch.avatar}
                    channelTitle={ch.channelTitle}
                    channelId={ch.channelId}
                    subscriberCount={ch.subscriberCount}
                    navigateOnClick={false}
                    onAdd={() => {
                      navigate(`/app/channel/${ch.channelId}`);
                      closeModal();
                    }}
                  />
                ))}
              </div>
            ) : searchPerformed &&
              searchQuery.trim() !== "" &&
              !searchLoading ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "2rem 0",
                  color: "#888",
                  fontSize: "1.1rem",
                }}
              >
                No results found.
              </div>
            ) : null
          }
        >
          <input
            type="text"
            placeholder="Search YouTube channel..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input"
            style={{ marginBottom: "0.5rem" }}
          />
        </Modal>
      )}
    </>
  );
};

export default Sidebar;
