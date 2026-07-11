import styles from './LoadingSpinner.module.css';

export default function LoadingSpinner({ message = 'Loading...' }) {
  return (
    <div className={styles.spinner} role="status" aria-live="polite">
      <div className={styles.spinner__ring} aria-hidden="true" />
      <p className={styles.spinner__message}>{message}</p>
    </div>
  );
}
