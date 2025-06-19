import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiUsers, FiZap, FiType, FiImage, FiBookmark, FiTv, } from 'react-icons/fi';
import '../styles/sidebar.css';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 1400);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <>
      <aside className={`sidebar ${isMobile ? 'mobile' : ''} ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-group">
          <div className="sidebar-heading">My Workspace</div>
          <Link to="/app/dashboard" className="sidebar-button">
            <FiBookmark className="sidebar-icon" />
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
          <Link to="/app/saved" className="sidebar-button">
            <FiBookmark className="sidebar-icon" />
            Saved
          </Link>
        </div>

        <div className="sidebar-group">
          <div className="sidebar-heading">Tools</div>
          <div className="sidebar-button">
            <FiZap className="sidebar-icon" />
            Idea Generator
          </div>
          <div className="sidebar-button">
            <FiType className="sidebar-icon" />
            Title Generator
          </div>
          <div className="sidebar-button">
            <FiImage className="sidebar-icon" />
            Thumbnail Generator
          </div>
        </div>
      </aside>
      {isMobile && isOpen && (
        <div
          className="sidebar-backdrop"
          onClick={toggleSidebar}
        />
      )}
    </>
  );
};

export default Sidebar;