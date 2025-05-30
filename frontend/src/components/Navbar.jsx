import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
    <header className="navbar">
      <div className="navbar-content">
        <a href="/" className="navbar-logo">
          <img src="/favicon.ico" alt="logo" className="logo-img" />
          <span className="logo-text">Streamline</span>
        </a>

        <nav className="navbar-links">
          <span className="nav-link">How to use</span>
          <button className="primary" onClick={() => navigate('/signup')}>
            Create an account
          </button>
        </nav>

        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>
    </header>

      {menuOpen && (
        <div className="mobile-menu">
          <span className="nav-link" onClick={() => setMenuOpen(false)}>How to use</span>
          <button className="primary" onClick={() => { setMenuOpen(false); navigate('/signup'); }}>
            Create an account
          </button>
        </div>
      )}
    </>
  );
};

export default Navbar;