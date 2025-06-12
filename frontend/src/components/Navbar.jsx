import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiBell, FiMoreVertical, FiMenu } from 'react-icons/fi';
import '../styles/navbar.css';

const Navbar = ({ toggleSidebar }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef();
  const { user, logout, loading } = useAuth();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (loading) {
    return (
      <header className="navbar auth-navbar">
        <div className="navbar-content">Loading...</div>
      </header>
    );
  }

  return (
    <header className="navbar auth-navbar">
      <div className="navbar-content">
        <div className="navbar-left">
          <button className="menu-toggle" onClick={toggleSidebar}>
            <FiMenu size={20} />
          </button>
          <Link to="/app/dashboard" className="navbar-logo">
            <img src="/logo.ico" alt="logo" className="logo-img" />
            <span className="logo-text">Streamline</span>
          </Link>
        </div>

        <div className="navbar-right">
          <FiBell className="nav-icon" size={20} />
          <div className="settings-wrapper" ref={dropdownRef}>
            <FiMoreVertical
              className="nav-icon"
              size={20}
              onClick={() => setDropdownOpen(!dropdownOpen)}
            />
            {dropdownOpen && (
              <div className="settings-dropdown">
                <button onClick={logout}>Logout</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;