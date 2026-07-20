import HeroSection from '../components/HeroSection';
import { useLanguage } from '../context/LanguageContext';
import styles from './HomePage.module.css';

const HOME_IMAGES = {
  hero: '/images/home/hero-cemetery-world.png',
  exploration: '/images/home/metroidvania-exploration.png',
  combat: '/images/home/action-platformer-combat.png',
  lore: '/images/home/world-lore-archive.png',
};

export default function HomePage() {
  const { t } = useLanguage();

  return (
    <div className="page page--wide">
      <HeroSection />

      <section className={styles.features}>
        <h2 className={styles.features__title}>{t('home.features.title')}</h2>
        <div className={styles.features__grid}>
          <article className={styles.imageCard}>
            <img src={HOME_IMAGES.combat} alt="" loading="lazy" />
            <div>
              <h3>{t('home.features.foes.title')}</h3>
              <p>{t('home.features.foes.body')}</p>
            </div>
          </article>
          <article className={styles.imageCard}>
            <img src={HOME_IMAGES.exploration} alt="" loading="lazy" />
            <div>
              <h3>{t('home.features.relics.title')}</h3>
              <p>{t('home.features.relics.body')}</p>
            </div>
          </article>
          <article className={styles.imageCard}>
            <img src={HOME_IMAGES.lore} alt="" loading="lazy" />
            <div>
              <h3>{t('home.features.legacy.title')}</h3>
              <p>{t('home.features.legacy.body')}</p>
            </div>
          </article>
        </div>
      </section>

      <section className={styles.seoSection}>
        <div className={styles.seoSection__intro}>
          <h2>{t('home.seo.title')}</h2>
          <p>{t('home.seo.body')}</p>
        </div>

        <div className={styles.seoSection__grid}>
          <article>
            <img src={HOME_IMAGES.exploration} alt="" loading="lazy" />
            <h3>{t('home.seo.metroidvania.title')}</h3>
            <p>{t('home.seo.metroidvania.body')}</p>
          </article>
          <article>
            <img src={HOME_IMAGES.combat} alt="" loading="lazy" />
            <h3>{t('home.seo.action.title')}</h3>
            <p>{t('home.seo.action.body')}</p>
          </article>
          <article>
            <img src={HOME_IMAGES.lore} alt="" loading="lazy" />
            <h3>{t('home.seo.world.title')}</h3>
            <p>{t('home.seo.world.body')}</p>
          </article>
        </div>
      </section>

      <section className={styles.loreTeaser} aria-label={t('home.loreTeaser.title')}>
        <img src={HOME_IMAGES.lore} alt="" loading="lazy" />
        <div>
          <h2>{t('home.loreTeaser.title')}</h2>
          <p>{t('home.loreTeaser.body')}</p>
        </div>
      </section>
    </div>
  );
}
