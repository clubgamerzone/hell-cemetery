import { useState } from 'react';
import itemPlaceholder from '../assets/images/item-placeholder.svg';
import ItemEditModal from './ItemEditModal';
import styles from './ItemCard.module.css';

function formatValue(value) {
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

function getRarityClass(rarity) {
  if (!rarity) return '';
  const r = String(rarity).toLowerCase();
  if (r.includes('legend') || r.includes('mythic')) return styles['rarity--legendary'];
  if (r.includes('epic') || r.includes('rare')) return styles['rarity--rare'];
  if (r.includes('uncommon')) return styles['rarity--uncommon'];
  return styles['rarity--common'];
}

export default function ItemCard({ item, showDebug = false, onSaved }) {
  const [isEditing, setIsEditing] = useState(false);
  const name = item.itemName || item.id || 'Unknown Item';
  const description = item.description;
  const type = item.typeLabel;
  const rarity = item.rarityLabel;
  const imageUrl = item.imageUrl;
  const stats = item.stats || [];

  return (
    <>
      <article className={styles.card}>
        <div className={styles.card__imageWrap}>
          <img
            src={imageUrl || itemPlaceholder}
            alt={name}
            className={styles.card__image}
            onError={(e) => {
              e.currentTarget.src = itemPlaceholder;
            }}
          />
          {rarity && (
            <span className={`${styles.card__rarity} ${getRarityClass(rarity)}`}>
              {rarity}
            </span>
          )}
        </div>
        <div className={styles.card__body}>
          <div className={styles.card__titleRow}>
            <h3 className={styles.card__name}>{name}</h3>
            {showDebug && (
              <button
                type="button"
                className={styles.card__editButton}
                onClick={() => setIsEditing(true)}
              >
                Edit
              </button>
            )}
          </div>
          {type && <span className={styles.card__type}>{type}</span>}
          <p className={styles.card__description}>{description}</p>

          {stats.length > 0 && (
            <div className={styles.card__stats}>
              {stats.slice(0, 8).map(({ key, label, value }) => (
                <div key={key} className={styles.stat}>
                  <span className={styles.stat__label}>{label}</span>
                  <span className={styles.stat__value}>{formatValue(value)}</span>
                </div>
              ))}
            </div>
          )}

          <ul className={styles.card__extra}>
            {showDebug && (
              <li>
                <strong>Firebase key:</strong> {item.firebaseKey}
              </li>
            )}
            {showDebug && item.itemId && item.itemId !== item.firebaseKey && (
              <li>
                <strong>Item ID:</strong> {item.itemId}
              </li>
            )}
            {item.maxStack !== undefined && (
              <li>
                <strong>Max stack:</strong> {item.maxStack}
              </li>
            )}
            {showDebug && item.storeItems.length > 0 && (
              <li>
                <strong>Store refs:</strong> {item.storeItems.length}
              </li>
            )}
            {showDebug && item.itemUsePrefabPath && (
              <li>
                <strong>Use prefab:</strong> {item.itemUsePrefabPath}
              </li>
            )}
          </ul>

          {stats.length > 8 && (
            <ul className={styles.card__extra}>
              {stats.slice(8, 14).map(({ key, label, value }) => (
                <li key={key}>
                  <strong>{label}:</strong> {formatValue(value)}
                </li>
              ))}
            </ul>
          )}
        </div>
      </article>

      {showDebug && isEditing && (
        <ItemEditModal
          item={item}
          onClose={() => setIsEditing(false)}
          onSaved={onSaved}
        />
      )}
    </>
  );
}
