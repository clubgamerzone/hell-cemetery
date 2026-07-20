import GothicButton from './GothicButton';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import heroPlaceholder from '../assets/images/hero-placeholder.svg';
import styles from './HeroSection.module.css';

const IOS_STORE_URL = 'https://apps.apple.com/us/app/hell-cemetery-metroidvania/id6749544780';
const ANDROID_STORE_URL = 'https://play.google.com/store/apps/details?id=com.ClubGamerZone.HellCemeteryMetroivania&hl=en';

export default function HeroSection() {
  const { currentUser } = useAuth();
  const { t } = useLanguage();

  return (
    <section className={styles.hero}>
      <div className={styles.hero__background}>
        <img
          src={heroPlaceholder}
          alt=""
          className={styles.hero__bgImage}
          aria-hidden="true"
        />
        <div className={styles.hero__overlay} />
      </div>

      <div className={styles.hero__content}>
        <h1 className={styles.hero__title}>Hell Cemetery</h1>
        <p className={styles.hero__subtitle}>{t('hero.subtitle')}</p>
        <p className={styles.hero__description}>
          {t('hero.description')}
        </p>
        <div className={styles.hero__actions}>
          {currentUser ? (
            <GothicButton to="/profile" size="large">
              {t('hero.profile')}
            </GothicButton>
          ) : (
            <GothicButton to="/login" size="large">
              {t('hero.login')}
            </GothicButton>
          )}
          <GothicButton to="/enemies" variant="secondary" size="large">
            {t('hero.enemies')}
          </GothicButton>
          <GothicButton to="/items" variant="ghost" size="large">
            {t('hero.items')}
          </GothicButton>
          <GothicButton
            href={IOS_STORE_URL}
            size="large"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('hero.downloadIos')}
          </GothicButton>
          <GothicButton
            href={ANDROID_STORE_URL}
            variant="secondary"
            size="large"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('hero.downloadAndroid')}
          </GothicButton>
          <GothicButton
            to="/play"
            variant="ghost"
            size="large"
            className={styles.hero__hiddenAction}
            aria-hidden="true"
            tabIndex={-1}
          >
            {t('hero.playWeb')}
          </GothicButton>
        </div>
      </div>
    </section>
  );
}
