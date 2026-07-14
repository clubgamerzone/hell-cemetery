import HeroSection from '../components/HeroSection';
import GothicCard from '../components/GothicCard';
import { useLanguage } from '../context/LanguageContext';
import styles from './HomePage.module.css';

export default function HomePage() {
  const { t } = useLanguage();

  return (
    <div className="page page--wide">
      <HeroSection />

      <section className={styles.features}>
        <h2 className={styles.features__title}>{t('home.features.title')}</h2>
        <div className={styles.features__grid}>
          <GothicCard title={t('home.features.foes.title')}>
            <p>{t('home.features.foes.body')}</p>
          </GothicCard>
          <GothicCard title={t('home.features.relics.title')}>
            <p>{t('home.features.relics.body')}</p>
          </GothicCard>
          <GothicCard title={t('home.features.legacy.title')}>
            <p>{t('home.features.legacy.body')}</p>
          </GothicCard>
        </div>
      </section>
    </div>
  );
}
