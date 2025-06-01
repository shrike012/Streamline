import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiBell, FiMoreVertical } from 'react-icons/fi';
import '../styles/navbar.css';

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef();
  const navigate = useNavigate();
  const { user, logout, loading } = useAuth();

  const handleNav = (path) => {
    navigate(path);
    setMenuOpen(false);
  };

  // Close dropdown if clicked outside
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
      <header className="navbar">
        <div className="navbar-content">
          <span>Loading...</span>
        </div>
      </header>
    );
  }

  return (
    <>
      <header className="navbar">
        <div className="navbar-content">
          <Link to="/" className="navbar-logo">
            <img src="/favicon.ico" alt="logo" className="logo-img" />
            <span className="logo-text">Streamline</span>
          </Link>

          <nav className="navbar-links">
            {user ? (
              <>
                <FiBell className="nav-icon" size={20} />
                <div className="nav-dropdown" ref={dropdownRef}>
                  <FiMoreVertical
                    className="nav-icon"
                    size={20}
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    style={{ cursor: 'pointer' }}
                  />
                  {dropdownOpen && (
                    <div className="dropdown-menu">
                      <span onClick={logout}>Logout</span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <span className="nav-link" onClick={() => navigate('/login')}>Log in</span>
                <button className="primary" onClick={() => navigate('/signup')}>
                  Create an account
                </button>
              </>
            )}
          </nav>

          <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </header>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="mobile-menu">
          {user ? (
            <>
              <span className="nav-link" onClick={() => handleNav('/dashboard')}>Dashboard</span>
              <button className="primary" onClick={logout}>Logout</button>
            </>
          ) : (
            <>
              <span className="nav-link" onClick={() => handleNav('/login')}>Log in</span>
              <button className="primary" onClick={() => handleNav('/signup')}>
                Create an account
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default Navbar;