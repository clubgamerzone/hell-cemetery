import GothicButton from './GothicButton';
import { useAuth } from '../context/AuthContext';
import heroPlaceholder from '../assets/images/hero-placeholder.svg';
import styles from './HeroSection.module.css';

export default function HeroSection() {
  const { currentUser } = useAuth();

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
        <p className={styles.hero__subtitle}>A dark gothic metroidvania adventure</p>
        <p className={styles.hero__description}>
          Descend into a cursed realm of crumbling crypts and forgotten kings.
          Explore interconnected ruins, battle unholy creatures, uncover ancient relics,
          and reclaim your castle from the shadows that dwell within Hell Cemetery.
        </p>
        <div className={styles.hero__actions}>
          {currentUser ? (
            <GothicButton to="/profile" size="large">
              View Profile
            </GothicButton>
          ) : (
            <GothicButton to="/login" size="large">
              Login
            </GothicButton>
          )}
          <GothicButton to="/enemies" variant="secondary" size="large">
            View Enemies
          </GothicButton>
          <GothicButton to="/items" variant="ghost" size="large">
            View Items
          </GothicButton>
        </div>
      </div>
    </section>
  );
}
