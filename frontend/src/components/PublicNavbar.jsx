import { useNavigate } from 'react-router-dom';

export default function PublicNavbar() {
  const navigate = useNavigate();

  return (
    <header className="navbar">
      <div className="navbar-content">
        <a href="/" className="navbar-logo">
          <img src="/favicon.ico" alt="logo" className="logo-img" />
          <span className="logo-text">Streamline</span>
        </a>
        <nav className="navbar-links">
          <span className="nav-link" onClick={() => navigate('/login')}>Log in</span>
          <button className="primary" onClick={() => navigate('/signup')}>
            Create an account
          </button>
        </nav>
      </div>
    </header>
  );
}