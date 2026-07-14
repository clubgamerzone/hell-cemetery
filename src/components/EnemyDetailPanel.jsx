import enemyPlaceholder from '../assets/images/enemy-placeholder.svg';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import CollapsibleJson from './CollapsibleJson';
import AdminJsonEditor from './AdminJsonEditor';
import EnemyAdminEditor from './EnemyAdminEditor';
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
  const itemQuery = drop.itemName || drop.itemId || drop.itemID || drop.id;

  return (
    <li className={styles.lootItem}>
      {itemQuery ? (
        <Link className={styles.lootName} to={`/items?item=${encodeURIComponent(itemQuery)}`}>
          {drop.itemName || itemQuery}
        </Link>
      ) : (
        <span className={styles.lootName}>{drop.itemName}</span>
      )}
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
    enemyData.commonDrops,
    enemyData.normalDrops,
    enemyData.legendaryDrops,
  ].filter(Array.isArray);
}

function SectionHeader({ title, editable, onEdit }) {
  return (
    <div className={styles.sectionHeader}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      {editable && (
        <button type="button" className={styles.editButton} onClick={onEdit}>
          Edit
        </button>
      )}
    </div>
  );
}

function yesNo(value) {
  return value ? 'Yes' : 'No';
}

function behaviorLabel(value) {
  const labels = {
    0: 'Static / Idle',
    1: 'Follow / Walker',
    2: 'Patrol',
  };
  return value === null || value === undefined || value === ''
    ? 'Prefab default'
    : labels[Number(value)] || String(value);
}

function getResistanceClass(value) {
  const percent = Number(String(value).match(/-?\d+(\.\d+)?/)?.[0]);
  if (Number.isNaN(percent)) return '';
  if (percent < 100) return styles.resistanceHigh;
  if (percent > 100) return styles.resistanceWeak;
  return styles.resistanceNeutral;
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

export default function EnemyDetailPanel({ enemy, enemies = [], showDebug = false, items = [], onSaved }) {
  const [editorSection, setEditorSection] = useState('');

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
        <button
          type="button"
          className={`${styles.portraitFrame} ${showDebug ? styles.portraitFrameEditable : ''}`}
          onClick={showDebug ? () => setEditorSection('portrait') : undefined}
          disabled={!showDebug}
          aria-label={showDebug ? 'Edit enemy portrait' : undefined}
        >
          <img
            src={enemy.imageUrl || enemyPlaceholder}
            alt={enemy.name}
            className={styles.portrait}
            onError={(e) => {
              e.currentTarget.src = enemyPlaceholder;
            }}
          />
          {showDebug && <span className={styles.portraitEdit}>Edit</span>}
        </button>

        <div className={styles.titleBlock}>
          <h2 className={styles.name}>{enemy.name}</h2>
          <p className={styles.type}>{typeLabel}</p>
          {(enemy.enemyFamily || enemy.attackElement) && (
            <p className={styles.subtype}>
              {[enemy.enemyFamily, enemy.attackElement].filter(Boolean).join(' / ')}
            </p>
          )}
          {showDebug && (
            <button type="button" className={styles.inlineEditButton} onClick={() => setEditorSection('identity')}>
              Edit details
            </button>
          )}
        </div>
      </div>

      <div className={styles.body}>
        {showDebug && (
          <EnemyAdminEditor
            enemy={enemy}
            enemies={enemies}
            items={items}
            openSection={editorSection}
            onClose={() => setEditorSection('')}
            onSaved={onSaved}
            validate={(nextValue) => validateEnemyLoot(nextValue, items)}
          />
        )}

        <section className={styles.section}>
          <SectionHeader title="Stats" editable={showDebug} onEdit={() => setEditorSection('stats')} />
          <div className={styles.statsGrid}>
            {CORE_STATS.map(({ key, label }) => (
              <StatRow key={key} label={label} value={enemy.stats[key]} />
            ))}
            {showDebug && (
              <>
                <StatRow label="Knockback X" value={enemy.raw?.knockbackForceX} />
                <StatRow label="Knockback Y" value={enemy.raw?.knockbackForceY} />
              </>
            )}
          </div>
        </section>

        {showDebug && (
          <section className={styles.section}>
            <SectionHeader title="Respawn & Movement" editable={showDebug} onEdit={() => setEditorSection('behavior')} />
            <div className={styles.statsGrid}>
              <StatRow label="Should Respawn" value={yesNo(enemy.raw?.shouldRespawn)} />
              <StatRow label="Override Respawn" value={yesNo(enemy.raw?.overrideRespawnSettings)} />
              <StatRow label="Respawn Time" value={enemy.raw?.timeToRespawn} />
              <StatRow label="Override Movement" value={yesNo(enemy.raw?.overrideMovementBehavior)} />
              <StatRow label="Behavior" value={behaviorLabel(enemy.raw?.behaviorType ?? enemy.behavior?.behaviorType)} />
              <StatRow label="Detection Radius" value={enemy.raw?.detectionRadius ?? enemy.behavior?.detectionRadius} />
              <StatRow label="Pursuit Multiplier" value={enemy.raw?.pursuitMultiplier ?? enemy.behavior?.pursuitMultiplier} />
              <StatRow label="Wait Time" value={enemy.raw?.timeToWait} />
              <StatRow label="Reset Time" value={enemy.raw?.timeToReset} />
              <StatRow label="React To Attack" value={yesNo(enemy.raw?.shouldReactToAttack)} />
            </div>
          </section>
        )}

        <section className={styles.section}>
          <SectionHeader title="Resistances" editable={showDebug} onEdit={() => setEditorSection('resistances')} />
          {enemy.resistances.length > 0 ? (
            <div className={styles.resistances}>
              {enemy.resistances.map((res) => (
                <div key={res.name} className={styles.resistanceRow}>
                  <span className={styles.resistanceName}>{res.name}</span>
                  <span className={`${styles.resistanceValue} ${getResistanceClass(res.value)}`}>
                    {res.value}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.muted}>No resistance data recorded.</p>
          )}
        </section>

        <section className={`${styles.section} ${styles.fullSection}`}>
          <SectionHeader title="Loot Drops" editable={showDebug} onEdit={() => setEditorSection('loot')} />
          {enemy.lootDrops.length > 0 ? (
            <ul className={styles.lootList}>
              {enemy.lootDrops.map((drop, index) => (
                <LootDropItem
                  key={`${drop.slotKey || index}-${drop.id || drop.itemID || drop.itemId || index}-${drop.itemName || index}`}
                  drop={drop}
                />
              ))}
            </ul>
          ) : (
            <p className={styles.muted}>No loot drops listed.</p>
          )}
        </section>

        <section className={`${styles.section} ${styles.fullSection}`}>
          <SectionHeader title="Lore" editable={showDebug} onEdit={() => setEditorSection('lore')} />
          <p className={styles.lore}>{enemy.description}</p>
        </section>

        {showDebug && (
          <section className={styles.debugSection}>
            <AdminJsonEditor
              title="Advanced JSON Editor"
              path={enemy.writePath}
              value={enemy.raw}
              validate={(nextValue) => validateEnemyLoot(nextValue, items)}
              onSaved={(savedData) => onSaved?.({
                data: savedData,
                category: savedData?.category || enemy.category,
                enemyKey: String(enemy.writePath || '').match(/^EnemySettings\/Categories\/[^/]+\/([^/]+)(\/enemyStats)?$/)?.[1] || enemy.id,
                writePath: enemy.writePath,
                previousId: enemy.id,
                selectedId: `${savedData?.category || enemy.category}_${String(enemy.writePath || '').match(/^EnemySettings\/Categories\/[^/]+\/([^/]+)(\/enemyStats)?$/)?.[1] || enemy.id}`.replace(/\s+/g, '_'),
              })}
            />
            <CollapsibleJson data={enemy.raw} title="Debug: Raw Enemy Data" />
          </section>
        )}
      </div>
    </article>
  );
}
