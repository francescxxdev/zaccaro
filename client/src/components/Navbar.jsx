import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user } = useAuth();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          <img src="/logo.png" alt="Zaccaro World Cup" className="brand-logo" />
        </Link>
        <div className="navbar-links">
          <div className="links-center">
            <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>
              Classifica
            </Link>
            <Link to="/giocatori" className={`nav-link ${isActive('/giocatori') ? 'active' : ''}`}>
              Giocatori
            </Link>
            <Link to="/news" className={`nav-link ${isActive('/news') ? 'active' : ''}`}>
              News
            </Link>
            <Link to="/infortunati" className={`nav-link ${isActive('/infortunati') ? 'active' : ''}`}>
              Infortunati
            </Link>
            {user?.isAdmin && (
              <Link to="/admin" className={`nav-link nav-admin ${isActive('/admin') ? 'active' : ''}`}>
                Dashboard
              </Link>
            )}
          </div>
          <div className="nav-user">
            <Link to="/profilo" className="nav-profile-btn" aria-label="Profilo">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <circle cx="12" cy="8" r="4" fill="currentColor" />
                <path d="M4 20c0-4 4-6 8-6s8 2 8 6" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
