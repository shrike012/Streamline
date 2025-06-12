import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiGrid, FiUsers, FiZap, FiType, FiImage, FiBookmark, FiTv, FiBarChart2 } from 'react-icons/fi';

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
          <div className="sidebar-button">
            <FiTv className="sidebar-icon" />
            My Channels
          </div>
          <div className="sidebar-button">
            <FiUsers className="sidebar-icon" />
            Competitors
          </div>
          <Link to="/app/saved" className="sidebar-button">
            <FiBookmark className="sidebar-icon" />
            Saved
          </Link>
        </div>

        <div className="sidebar-group">
          <div className="sidebar-heading">Tools</div>
          <Link to="/app/channel" className="sidebar-button">
            <FiBarChart2 className="sidebar-icon" />
            Channel Analyzer
          </Link>
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