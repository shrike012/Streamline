import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/navbar.css';

export default function PublicNavbar() {
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

          <nav className={`navbar-links ${menuOpen ? 'hidden-on-mobile' : ''}`}>
            <span className="nav-link" onClick={() => navigate('/login')}>Log in</span>
            <button className="primary" onClick={() => navigate('/signup')}>
              Create an account
            </button>
          </nav>

          {/* Hamburger / X */}
          <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </header>

      {/* Fullscreen Mobile Menu */}
      {menuOpen && (
        <div className="mobile-menu">
          <span className="nav-link" onClick={() => { setMenuOpen(false); navigate('/login'); }}>Log in</span>
          <button className="primary" onClick={() => { setMenuOpen(false); navigate('/signup'); }}>
            Create an account
          </button>
        </div>
      )}
    </>
  );
}