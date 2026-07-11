import enemyPlaceholder from '../assets/images/enemy-placeholder.svg';
import styles from './EnemyCard.module.css';

const DEFAULT_DESCRIPTION =
  'A fearsome creature lurking in the shadows of Hell Cemetery, waiting to claim unwary souls.';

const STAT_KEYS = ['hp', 'HP', 'health', 'damage', 'Damage', 'speed', 'Speed'];
const REWARD_KEYS = ['rewards', 'Rewards', 'reward', 'Reward', 'drops', 'Drops'];
const IMAGE_KEYS = ['image', 'Image', 'imageUrl', 'ImageUrl', 'icon', 'Icon', 'sprite', 'Sprite'];
const NAME_KEYS = ['name', 'Name', 'displayName', 'DisplayName', 'title', 'Title'];

function pickField(enemy, keys) {
  for (const key of keys) {
    if (enemy[key] !== undefined && enemy[key] !== null && enemy[key] !== '') {
      return enemy[key];
    }
  }
  return null;
}

function formatValue(value) {
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

export default function EnemyCard({ enemy }) {
  const name = pickField(enemy, NAME_KEYS) || enemy.id || 'Unknown Enemy';
  const description = pickField(enemy, ['description', 'Description']) || DEFAULT_DESCRIPTION;
  const imageUrl = pickField(enemy, IMAGE_KEYS);

  const stats = {};
  STAT_KEYS.forEach((key) => {
    if (enemy[key] !== undefined && enemy[key] !== null) {
      stats[key] = enemy[key];
    }
  });

  const rewards = pickField(enemy, REWARD_KEYS);

  const extraFields = Object.entries(enemy).filter(
    ([key]) =>
      !['id', ...NAME_KEYS, 'description', 'Description', ...STAT_KEYS, ...REWARD_KEYS, ...IMAGE_KEYS].includes(key)
  );

  return (
    <article className={styles.card}>
      <div className={styles.card__imageWrap}>
        <img
          src={imageUrl || enemyPlaceholder}
          alt={name}
          className={styles.card__image}
          onError={(e) => {
            e.currentTarget.src = enemyPlaceholder;
          }}
        />
      </div>
      <div className={styles.card__body}>
        <h3 className={styles.card__name}>{name}</h3>
        <p className={styles.card__description}>{description}</p>

        {Object.keys(stats).length > 0 && (
          <div className={styles.card__stats}>
            {Object.entries(stats).map(([key, value]) => (
              <div key={key} className={styles.stat}>
                <span className={styles.stat__label}>{key}</span>
                <span className={styles.stat__value}>{formatValue(value)}</span>
              </div>
            ))}
          </div>
        )}

        {rewards && (
          <div className={styles.card__rewards}>
            <span className={styles.card__rewardsLabel}>Rewards</span>
            <span className={styles.card__rewardsValue}>{formatValue(rewards)}</span>
          </div>
        )}

        {extraFields.length > 0 && (
          <ul className={styles.card__extra}>
            {extraFields.slice(0, 4).map(([key, value]) => (
              <li key={key}>
                <strong>{key}:</strong> {formatValue(value)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
