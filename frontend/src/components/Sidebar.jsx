import React from 'react';
import '../styles/sidebar.css';

const Sidebar = () => {
  return (
    <div className="sidebar">
      <div className="sidebar-section">Dashboard</div>
      <div className="sidebar-section">My Channels</div>
      <div className="sidebar-section">Competitors</div>
      <div className="sidebar-section">Idea Generator</div>
      <div className="sidebar-section">Packaging Generator</div>
      <div className="sidebar-section">Bookmarks</div>
    </div>
  );
};

export default Sidebar;