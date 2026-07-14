import { Link, NavLink } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import GothicButton from './GothicButton';
import logoPlaceholder from '../assets/images/logo-placeholder.svg';
import styles from './Navbar.module.css';

const navLinks = [
  { to: '/', labelKey: 'nav.home', end: true },
  { to: '/enemies', labelKey: 'nav.enemies' },
  { to: '/items', labelKey: 'nav.items' },
  { to: '/crafting', labelKey: 'nav.crafting' },
  { to: '/feedback', labelKey: 'nav.feedback' },
  { to: '/profile', labelKey: 'nav.profile' },
  { to: '/privacy-policy', labelKey: 'nav.privacy' },
];

export default function Navbar() {
  const { currentUser, isAdmin, loading, logout } = useAuth();
  const { language, languages, setLanguage, t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const visibleNavLinks = isAdmin
    ? [...navLinks, { to: '/game-data', labelKey: 'nav.gameData' }]
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
          aria-label={t('nav.toggle')}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className={styles['navbar__toggle-bar']} />
          <span className={styles['navbar__toggle-bar']} />
          <span className={styles['navbar__toggle-bar']} />
        </button>

        <div className={`${styles.navbar__menu} ${menuOpen ? styles['navbar__menu--open'] : ''}`}>
          <ul className={styles.navbar__links}>
            {visibleNavLinks.map(({ to, labelKey, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `${styles.navbar__link} ${isActive ? styles['navbar__link--active'] : ''}`
                  }
                  onClick={closeMenu}
                >
                  {t(labelKey)}
                </NavLink>
              </li>
            ))}
          </ul>

          <div className={styles.navbar__language} aria-label={t('nav.language')}>
            {languages.map((languageOption) => (
              <button
                type="button"
                key={languageOption.code}
                className={`${styles.navbar__flag} ${
                  languageOption.code === language ? styles['navbar__flag--active'] : ''
                }`}
                title={languageOption.label}
                aria-label={`${t('nav.language')}: ${languageOption.label}`}
                aria-pressed={languageOption.code === language}
                onClick={() => {
                  setLanguage(languageOption.code);
                  closeMenu();
                }}
              >
                {languageOption.flag}
              </button>
            ))}
          </div>

          <div className={styles.navbar__auth}>
            {loading ? (
              <span className={styles.navbar__link}>...</span>
            ) : currentUser ? (
              <GothicButton variant="ghost" size="small" onClick={handleLogout}>
                {t('nav.logout')}
              </GothicButton>
            ) : (
              <GothicButton to="/login" variant="secondary" size="small" onClick={closeMenu}>
                {t('nav.login')}
              </GothicButton>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
