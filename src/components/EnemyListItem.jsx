import enemyPlaceholder from '../assets/images/enemy-placeholder.svg';
import styles from './EnemyListItem.module.css';

export default function EnemyListItem({ enemy, isSelected, onSelect }) {
  return (
    <button
      type="button"
      className={`${styles.item} ${isSelected ? styles.itemSelected : ''}`}
      onClick={() => onSelect(enemy)}
      aria-current={isSelected ? 'true' : undefined}
    >
      <span className={styles.thumb}>
        <img
          src={enemy.imageUrl || enemyPlaceholder}
          alt=""
          onError={(e) => {
            e.currentTarget.src = enemyPlaceholder;
          }}
        />
      </span>
      <span className={styles.info}>
        <span className={styles.name}>{enemy.name}</span>
        <span className={styles.category}>{enemy.categoryLabel}</span>
      </span>
    </button>
  );
}
