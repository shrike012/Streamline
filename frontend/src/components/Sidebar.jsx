import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../styles/sidebar.css';

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <img src="/favicon.ico" alt="logo" className="sidebar-logo-img" />
        <span className="sidebar-logo-text">Streamline</span>
      </div>
      <nav className="sidebar-nav">
        <Link to="/dashboard" className={location.pathname === '/dashboard' ? 'active' : ''}>
          Dashboard
        </Link>
        <Link to="/settings" className={location.pathname === '/settings' ? 'active' : ''}>
          Settings
        </Link>
      </nav>
    </aside>
  );
}