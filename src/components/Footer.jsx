import { Link } from 'react-router-dom';
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <ul className={styles.footer__links}>
        <li>
          <Link to="/privacy-policy" className={styles.footer__link}>
            Privacy Policy
          </Link>
        </li>
        <li>
          <Link to="/game-data" className={styles.footer__link}>
            Game Data
          </Link>
        </li>
      </ul>
      <p className={styles.footer__text}>
        Hell Cemetery &copy; 2026. All rights reserved.
      </p>
    </footer>
  );
}
