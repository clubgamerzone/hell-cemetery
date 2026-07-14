import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import styles from './Footer.module.css';

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className={styles.footer}>
      <ul className={styles.footer__links}>
        <li>
          <Link to="/privacy-policy" className={styles.footer__link}>
            {t('nav.privacy')}
          </Link>
        </li>
        <li>
          <Link to="/game-data" className={styles.footer__link}>
            {t('nav.gameData')}
          </Link>
        </li>
      </ul>
      <p className={styles.footer__text}>
        Hell Cemetery &copy; 2026. {t('footer.rights')}
      </p>
    </footer>
  );
}
