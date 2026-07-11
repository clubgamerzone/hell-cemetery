import styles from './GothicCard.module.css';

export default function GothicCard({
  title,
  children,
  flat = false,
  className = '',
}) {
  return (
    <div
      className={`${styles.card} ${flat ? styles['card--flat'] : ''} ${className}`}
    >
      {title && <h3 className={styles.card__title}>{title}</h3>}
      <div className={styles.card__content}>{children}</div>
    </div>
  );
}
