import enemyPlaceholder from '../assets/images/enemy-placeholder.svg';
import CollapsibleJson from './CollapsibleJson';
import AdminJsonEditor from './AdminJsonEditor';
import { formatStatValue, formatDropChance } from '../utils/enemyParser';
import styles from './EnemyDetailPanel.module.css';

const CORE_STATS = [
  { key: 'health', label: 'Health' },
  { key: 'defense', label: 'Defense' },
  { key: 'speed', label: 'Speed' },
  { key: 'damage', label: 'Damage' },
  { key: 'experience', label: 'Experience' },
];

function StatRow({ label, value }) {
  return (
    <div className={styles.statRow}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>{formatStatValue(value)}</span>
    </div>
  );
}

function LootDropItem({ drop }) {
  const chance = formatDropChance(drop.dropChance);

  return (
    <li className={styles.lootItem}>
      <span className={styles.lootName}>{drop.itemName}</span>
      <span className={styles.lootMeta}>
        {drop.isGuaranteed && <span className={styles.lootTag}>Guaranteed</span>}
        {drop.dropTier && <span className={styles.lootTag}>{drop.dropTier}</span>}
        {chance && <span className={styles.lootTag}>{chance}</span>}
        {drop.minAmount !== null && drop.maxAmount !== null && (
          <span className={styles.lootTag}>
            x{drop.minAmount === drop.maxAmount ? drop.minAmount : `${drop.minAmount}-${drop.maxAmount}`}
          </span>
        )}
      </span>
    </li>
  );
}

function getDropArrays(enemyData) {
  return [
    enemyData.lootDrops,
    enemyData.drops,
    enemyData.Drops,
    enemyData.rewards,
    enemyData.commonDrops,
    enemyData.normalDrops,
    enemyData.uncommonDrops,
    enemyData.rareDrops,
    enemyData.veryRareDrops,
    enemyData.legendaryDrops,
  ].filter(Array.isArray);
}

function validateEnemyLoot(enemyData, items) {
  const itemKeys = new Set(
    items.flatMap((item) => [
      item.firebaseKey,
      item.itemId,
      item.itemName,
    ].filter(Boolean).map(String)),
  );

  const invalidDrops = getDropArrays(enemyData)
    .flat()
    .filter((drop) => {
      const value = typeof drop === 'object'
        ? drop.itemID ?? drop.itemId ?? drop.itemName ?? drop.name
        : drop;
      return value && !itemKeys.has(String(value));
    });

  if (invalidDrops.length > 0) {
    const names = invalidDrops
      .slice(0, 4)
      .map((drop) => typeof drop === 'object' ? drop.itemName || drop.itemID || drop.itemId || drop.name : drop)
      .join(', ');
    return `Loot drops must reference existing items. Not found: ${names}`;
  }

  return '';
}

export default function EnemyDetailPanel({ enemy, showDebug = false, items = [], onSaved }) {
  if (!enemy) {
    return (
      <div className={styles.empty}>
        <p>Select an enemy from the list to view its encyclopedia entry.</p>
      </div>
    );
  }

  const typeLabel = enemy.isBoss ? 'Boss' : enemy.categoryLabel;

  return (
    <article className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.portraitFrame}>
          <img
            src={enemy.imageUrl || enemyPlaceholder}
            alt={enemy.name}
            className={styles.portrait}
            onError={(e) => {
              e.currentTarget.src = enemyPlaceholder;
            }}
          />
        </div>

        <div className={styles.titleBlock}>
          <h2 className={styles.name}>{enemy.name}</h2>
          <p className={styles.type}>{typeLabel}</p>
          {(enemy.enemyFamily || enemy.attackElement) && (
            <p className={styles.subtype}>
              {[enemy.enemyFamily, enemy.attackElement].filter(Boolean).join(' / ')}
            </p>
          )}
        </div>
      </div>

      <div className={styles.body}>
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Stats</h3>
          <div className={styles.statsGrid}>
            {CORE_STATS.map(({ key, label }) => (
              <StatRow key={key} label={label} value={enemy.stats[key]} />
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Resistances</h3>
          {enemy.resistances.length > 0 ? (
            <div className={styles.resistances}>
              {enemy.resistances.map((res) => (
                <div key={res.name} className={styles.resistanceRow}>
                  <span className={styles.resistanceName}>{res.name}</span>
                  <span className={styles.resistanceValue}>{res.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.muted}>No resistance data recorded.</p>
          )}
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Loot Drops</h3>
          {enemy.lootDrops.length > 0 ? (
            <ul className={styles.lootList}>
              {enemy.lootDrops.map((drop) => (
                <LootDropItem key={`${drop.id}-${drop.itemName}`} drop={drop} />
              ))}
            </ul>
          ) : (
            <p className={styles.muted}>No loot drops listed.</p>
          )}
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Lore</h3>
          <p className={styles.lore}>{enemy.description}</p>
        </section>

        {showDebug && (
          <section className={styles.debugSection}>
            <AdminJsonEditor
              title="Admin Enemy Editor"
              path={enemy.writePath}
              value={enemy.raw}
              validate={(nextValue) => validateEnemyLoot(nextValue, items)}
              onSaved={onSaved}
            />
            <CollapsibleJson data={enemy.raw} title="Debug: Raw Enemy Data" />
          </section>
        )}
      </div>
    </article>
  );
}
