import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/navbar.css';

export default function PublicNavbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <header className="navbar public-navbar">
        <div className="navbar-content">
          <a href="/" className="navbar-logo">
            <img src="/logo.ico" alt="logo" className="logo-img" />
            <span className="logo-text">Streamline</span>
          </a>

          <nav className="navbar-links">
            <span className="nav-link" onClick={() => navigate('/login')}>Log in</span>
            <button className="primary" onClick={() => navigate('/signup')}>Create an account</button>
          </nav>

          <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </header>

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