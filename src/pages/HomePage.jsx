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

      <section className={styles.seoSection}>
        <div className={styles.seoSection__intro}>
          <h2>{t('home.seo.title')}</h2>
          <p>{t('home.seo.body')}</p>
        </div>

        <div className={styles.seoSection__grid}>
          <article>
            <h3>{t('home.seo.metroidvania.title')}</h3>
            <p>{t('home.seo.metroidvania.body')}</p>
          </article>
          <article>
            <h3>{t('home.seo.action.title')}</h3>
            <p>{t('home.seo.action.body')}</p>
          </article>
          <article>
            <h3>{t('home.seo.world.title')}</h3>
            <p>{t('home.seo.world.body')}</p>
          </article>
        </div>
      </section>

      <section className={styles.loreTeaser} aria-label={t('home.loreTeaser.title')}>
        <h2>{t('home.loreTeaser.title')}</h2>
        <p>{t('home.loreTeaser.body')}</p>
      </section>
    </div>
  );
}
