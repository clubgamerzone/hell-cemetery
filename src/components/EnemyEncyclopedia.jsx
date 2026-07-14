import { useEffect, useMemo, useState } from 'react';
import EnemyListItem from './EnemyListItem';
import EnemyDetailPanel from './EnemyDetailPanel';
import { groupEnemiesByCategory } from '../utils/enemyParser';
import styles from './EnemyEncyclopedia.module.css';

const RARITY_LABELS = {
  0: 'Common',
  1: 'Normal',
  2: 'Uncommon',
  3: 'Rare',
  4: 'Unique',
  5: 'Legendary',
};

function getEnemyRarity(enemy) {
  const rarity = enemy.rarity ?? enemy.raw?.rarity;
  if (rarity === null || rarity === undefined || rarity === '') return 'Unspecified';
  if (typeof rarity === 'number' || /^\d+$/.test(String(rarity))) {
    return RARITY_LABELS[Number(rarity)] || String(rarity);
  }
  return String(rarity).replace(/_/g, ' ');
}

export default function EnemyEncyclopedia({
  enemies,
  showDebug = false,
  items = [],
  onSaved,
  selectedId: controlledSelectedId,
  onSelectedIdChange,
}) {
  const [localSelectedId, setLocalSelectedId] = useState(enemies[0]?.id ?? null);
  const [filter, setFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [rarityFilter, setRarityFilter] = useState('');
  const selectedId = controlledSelectedId ?? localSelectedId;

  function selectEnemy(id) {
    setLocalSelectedId(id);
    onSelectedIdChange?.(id);
  }

  const groups = useMemo(() => groupEnemiesByCategory(enemies), [enemies]);
  const categoryOptions = useMemo(
    () => groups.map((group) => ({
      value: group.category,
      label: group.label,
      count: group.enemies.length,
    })),
    [groups],
  );
  const rarityOptions = useMemo(() => {
    const counts = new Map();
    enemies.forEach((enemy) => {
      const rarity = getEnemyRarity(enemy);
      counts.set(rarity, (counts.get(rarity) || 0) + 1);
    });
    return Array.from(counts, ([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [enemies]);

  const filteredGroups = useMemo(() => {
    const query = filter.trim().toLowerCase();

    return groups
      .filter((group) => !categoryFilter || group.category === categoryFilter)
      .map((group) => ({
        ...group,
        enemies: !query
          ? group.enemies.filter((enemy) => !rarityFilter || getEnemyRarity(enemy) === rarityFilter)
          : group.enemies.filter((enemy) =>
            (!rarityFilter || getEnemyRarity(enemy) === rarityFilter) &&
            (
              enemy.name.toLowerCase().includes(query) ||
              enemy.categoryLabel.toLowerCase().includes(query) ||
              String(enemy.category || '').toLowerCase().includes(query) ||
              getEnemyRarity(enemy).toLowerCase().includes(query) ||
              String(enemy.enemyFamily || '').toLowerCase().includes(query) ||
              String(enemy.attackElement || '').toLowerCase().includes(query)
            ),
          ),
      }))
      .filter((group) => group.enemies.length > 0);
  }, [groups, filter, categoryFilter, rarityFilter]);

  const selectedEnemy =
    enemies.find((enemy) => enemy.id === selectedId) ||
    filteredGroups[0]?.enemies[0] ||
    enemies[0] ||
    null;

  useEffect(() => {
    if (selectedEnemy && selectedEnemy.id !== selectedId) {
      selectEnemy(selectedEnemy.id);
    }
  }, [selectedEnemy?.id, selectedId]);

  return (
    <div className={styles.encyclopedia}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h2 className={styles.sidebarTitle}>Bestiary</h2>
          <span className={styles.count}>{enemies.length} entries</span>
        </div>

        <div className={styles.filters}>
          <input
            type="search"
            className={styles.search}
            placeholder="Search enemies..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label="Search enemies"
          />
          <select
            className={styles.categorySelect}
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            aria-label="Filter enemies by category"
          >
            <option value="">All categories</option>
            {categoryOptions.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label} ({category.count})
              </option>
            ))}
          </select>
          <select
            className={styles.categorySelect}
            value={rarityFilter}
            onChange={(event) => setRarityFilter(event.target.value)}
            aria-label="Filter enemies by rarity"
          >
            <option value="">All rarities</option>
            {rarityOptions.map((rarity) => (
              <option key={rarity.value} value={rarity.value}>
                {rarity.value} ({rarity.count})
              </option>
            ))}
          </select>
        </div>

        <div className={styles.listScroll}>
          {filteredGroups.map((group) => (
            <div key={group.category} className={styles.group}>
              <h3 className={styles.groupTitle}>{group.label}</h3>
              <div className={styles.groupList}>
                {group.enemies.map((enemy) => (
                  <EnemyListItem
                    key={enemy.id}
                    enemy={enemy}
                    isSelected={selectedEnemy?.id === enemy.id}
                    onSelect={(entry) => selectEnemy(entry.id)}
                  />
                ))}
              </div>
            </div>
          ))}

          {filteredGroups.length === 0 && (
            <p className={styles.noResults}>No enemies match your search.</p>
          )}
        </div>
      </aside>

      <div className={styles.detail}>
        <EnemyDetailPanel
          key={selectedEnemy?.id || 'empty-enemy'}
          enemy={selectedEnemy}
          enemies={enemies}
          showDebug={showDebug}
          items={items}
          onSaved={(savedEnemy) => {
            const savedEnemyId = typeof savedEnemy === 'string'
              ? savedEnemy
              : savedEnemy?.selectedId;
            if (savedEnemyId) selectEnemy(savedEnemyId);
            onSaved?.(savedEnemy || savedEnemyId || selectedEnemy?.id);
          }}
        />
      </div>
    </div>
  );
}
