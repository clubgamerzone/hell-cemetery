import { useMemo, useState } from 'react';
import EnemyListItem from './EnemyListItem';
import EnemyDetailPanel from './EnemyDetailPanel';
import { groupEnemiesByCategory } from '../utils/enemyParser';
import styles from './EnemyEncyclopedia.module.css';

export default function EnemyEncyclopedia({ enemies, showDebug = false, items = [], onSaved }) {
  const [selectedId, setSelectedId] = useState(enemies[0]?.id ?? null);
  const [filter, setFilter] = useState('');

  const groups = useMemo(() => groupEnemiesByCategory(enemies), [enemies]);

  const filteredGroups = useMemo(() => {
    const query = filter.trim().toLowerCase();
    if (!query) return groups;

    return groups
      .map((group) => ({
        ...group,
        enemies: group.enemies.filter(
          (enemy) =>
            enemy.name.toLowerCase().includes(query) ||
            enemy.categoryLabel.toLowerCase().includes(query) ||
            String(enemy.category || '').toLowerCase().includes(query) ||
            String(enemy.enemyFamily || '').toLowerCase().includes(query) ||
            String(enemy.attackElement || '').toLowerCase().includes(query),
        ),
      }))
      .filter((group) => group.enemies.length > 0);
  }, [groups, filter]);

  const selectedEnemy =
    enemies.find((enemy) => enemy.id === selectedId) ||
    filteredGroups[0]?.enemies[0] ||
    enemies[0] ||
    null;

  return (
    <div className={styles.encyclopedia}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h2 className={styles.sidebarTitle}>Bestiary</h2>
          <span className={styles.count}>{enemies.length} entries</span>
        </div>

        <input
          type="search"
          className={styles.search}
          placeholder="Search enemies..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Search enemies"
        />

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
                    onSelect={(entry) => setSelectedId(entry.id)}
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
          enemy={selectedEnemy}
          enemies={enemies}
          showDebug={showDebug}
          items={items}
          onSaved={onSaved}
        />
      </div>
    </div>
  );
}
