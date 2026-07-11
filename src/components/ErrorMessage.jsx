import styles from './ErrorMessage.module.css';

export default function ErrorMessage({ message, onRetry }) {
  if (!message) return null;

  return (
    <div className={styles.error} role="alert">
      <p className={styles.error__text}>{message}</p>
      {onRetry && (
        <button type="button" className={styles.error__retry} onClick={onRetry}>
          Try Again
        </button>
      )}
    </div>
  );
}
