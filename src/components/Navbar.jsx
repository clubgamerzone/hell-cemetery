import { Link, NavLink } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import GothicButton from './GothicButton';
import logoPlaceholder from '../assets/images/logo-placeholder.svg';
import styles from './Navbar.module.css';

const navLinks = [
  { to: '/', label: 'Home', end: true },
  { to: '/enemies', label: 'Enemies' },
  { to: '/items', label: 'Items' },
  { to: '/crafting', label: 'Crafting' },
  { to: '/profile', label: 'Profile' },
  { to: '/privacy-policy', label: 'Privacy Policy' },
];

export default function Navbar() {
  const { currentUser, isAdmin, loading, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const visibleNavLinks = isAdmin
    ? [...navLinks, { to: '/game-data', label: 'Game Data' }, { to: '/admin/security', label: 'Security' }]
    : navLinks;

  async function handleLogout() {
    try {
      await logout();
      setMenuOpen(false);
    } catch {
      setMenuOpen(false);
    }
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <nav className={styles.navbar}>
      <div className={styles.navbar__inner}>
        <Link to="/" className={styles.navbar__logo} onClick={closeMenu}>
          <img
            src={logoPlaceholder}
            alt="Hell Cemetery logo"
            className={styles['navbar__logo-img']}
          />
          <span className={styles['navbar__logo-text']}>Hell Cemetery</span>
        </Link>

        <button
          type="button"
          className={styles.navbar__toggle}
          aria-label="Toggle navigation menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className={styles['navbar__toggle-bar']} />
          <span className={styles['navbar__toggle-bar']} />
          <span className={styles['navbar__toggle-bar']} />
        </button>

        <div className={`${styles.navbar__menu} ${menuOpen ? styles['navbar__menu--open'] : ''}`}>
          <ul className={styles.navbar__links}>
            {visibleNavLinks.map(({ to, label, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `${styles.navbar__link} ${isActive ? styles['navbar__link--active'] : ''}`
                  }
                  onClick={closeMenu}
                >
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>

          <div className={styles.navbar__auth}>
            {loading ? (
              <span className={styles.navbar__link}>...</span>
            ) : currentUser ? (
              <GothicButton variant="ghost" size="small" onClick={handleLogout}>
                Logout
              </GothicButton>
            ) : (
              <GothicButton to="/login" variant="secondary" size="small" onClick={closeMenu}>
                Login
              </GothicButton>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
