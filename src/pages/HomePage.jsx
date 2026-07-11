import HeroSection from '../components/HeroSection';
import GothicCard from '../components/GothicCard';
import styles from './HomePage.module.css';

export default function HomePage() {
  return (
    <div className="page page--wide">
      <HeroSection />

      <section className={styles.features}>
        <h2 className={styles.features__title}>Explore the Darkness</h2>
        <div className={styles.features__grid}>
          <GothicCard title="Deadly Foes">
            <p>
              Face twisted horrors drawn from gothic folklore. Study enemy stats,
              weaknesses, and rewards before you descend into the crypts.
            </p>
          </GothicCard>
          <GothicCard title="Ancient Relics">
            <p>
              Discover weapons, armor, and artifacts scattered across the cemetery.
              Each item carries its own legend — and its own power.
            </p>
          </GothicCard>
          <GothicCard title="Your Legacy">
            <p>
              Log in to view your castle, market listings, and raid history.
              Your progress in Hell Cemetery follows you from the game to the web.
            </p>
          </GothicCard>
        </div>
      </section>
    </div>
  );
}
