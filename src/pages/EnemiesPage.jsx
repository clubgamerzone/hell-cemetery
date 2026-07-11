import { useEffect, useState } from 'react';
import {
  getEnemySettings,
  getItems,
  normalizeEnemies,
  normalizeItemSettings,
} from '../firebase/databaseService';
import EnemyEncyclopedia from '../components/EnemyEncyclopedia';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import { useAuth } from '../context/AuthContext';

export default function EnemiesPage() {
  const { isAdmin } = useAuth();
  const [enemies, setEnemies] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadEnemies() {
    setLoading(true);
    setError('');
    try {
      const data = await getEnemySettings();
      setEnemies(normalizeEnemies(data));
      if (isAdmin) {
        const itemData = await getItems();
        setItems(normalizeItemSettings(itemData));
      }
    } catch {
      setError('Failed to load enemy data. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEnemies();
  }, [isAdmin]);

  const categoryCount = new Set(enemies.map((enemy) => enemy.category)).size;

  return (
    <div className="page page--wide">
      <div className="page-header">
        <h1>Enemies of the Cemetery</h1>
        <p>
          Browse the bestiary encyclopedia — stats, loot drops, and lore for every
          creature in Hell Cemetery.
        </p>
      </div>

      {!loading && !error && enemies.length > 0 && (
        <div className="notice notice--info" style={{ marginBottom: '1.25rem' }}>
          {enemies.length} enemies catalogued across {categoryCount} categories.
        </div>
      )}

      {loading && <LoadingSpinner message="Summoning enemy data..." />}
      <ErrorMessage message={error} onRetry={loadEnemies} />

      {!loading && !error && enemies.length === 0 && (
        <div className="empty-state">
          No enemies found in the database yet. They will emerge from the fog soon.
        </div>
      )}

      {!loading && !error && enemies.length > 0 && (
        <EnemyEncyclopedia
          enemies={enemies}
          showDebug={isAdmin}
          items={items}
          onSaved={loadEnemies}
        />
      )}
    </div>
  );
}
