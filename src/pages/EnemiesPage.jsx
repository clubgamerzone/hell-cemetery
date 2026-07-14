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
import { useLanguage } from '../context/LanguageContext';

function sortEnemies(a, b) {
  const categoryCompare = String(a.category || '').localeCompare(String(b.category || ''));
  if (categoryCompare !== 0) return categoryCompare;
  return String(a.name || a.id || '').localeCompare(String(b.name || b.id || ''));
}

export default function EnemiesPage() {
  const { isAdmin } = useAuth();
  const { t } = useLanguage();
  const [enemies, setEnemies] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEnemyId, setSelectedEnemyId] = useState(null);
  const [error, setError] = useState('');

  async function loadEnemies(savedEnemyId = null) {
    if (savedEnemyId) {
      setSelectedEnemyId(savedEnemyId);
    }

    setLoading(enemies.length === 0);
    setError('');
    try {
      const data = await getEnemySettings();
      setEnemies(normalizeEnemies(data));
      if (isAdmin) {
        const itemData = await getItems();
        setItems(normalizeItemSettings(itemData));
      }
    } catch {
      setError(t('enemies.error'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEnemies();
  }, [isAdmin]);

  function handleEnemySaved(savedEnemy) {
    if (typeof savedEnemy === 'string') {
      setSelectedEnemyId(savedEnemy);
      return;
    }

    if (!savedEnemy?.data || !savedEnemy.category || !savedEnemy.enemyKey) {
      loadEnemies(savedEnemy?.selectedId || null);
      return;
    }

    const normalized = normalizeEnemies({
      Categories: {
        [savedEnemy.category]: {
          [savedEnemy.enemyKey]: savedEnemy.data,
        },
      },
    })[0];

    if (!normalized) {
      loadEnemies(savedEnemy.selectedId || null);
      return;
    }

    const nextEnemy = {
      ...normalized,
      writePath: savedEnemy.writePath || normalized.writePath,
    };
    const nextSelectedId = savedEnemy.selectedId || nextEnemy.id;
    setSelectedEnemyId(nextSelectedId);
    setEnemies((current) => {
      const removeIds = new Set([savedEnemy.previousId, nextEnemy.id].filter(Boolean));
      const nextEnemies = current.filter((enemy) =>
        !removeIds.has(enemy.id) &&
        enemy.writePath !== savedEnemy.writePath);
      return [...nextEnemies, nextEnemy].sort(sortEnemies);
    });
  }

  const categoryCount = new Set(enemies.map((enemy) => enemy.category)).size;

  return (
    <div className="page page--wide">
      <div className="page-header">
        <h1>{t('enemies.title')}</h1>
        <p>{t('enemies.subtitle')}</p>
      </div>

      {!loading && !error && enemies.length > 0 && (
        <div className="notice notice--info" style={{ marginBottom: '1.25rem' }}>
          {t('enemies.notice', { count: enemies.length, categories: categoryCount })}
        </div>
      )}

      {loading && <LoadingSpinner message={t('enemies.loading')} />}
      <ErrorMessage message={error} onRetry={() => loadEnemies()} />

      {!loading && !error && enemies.length === 0 && (
        <div className="empty-state">{t('enemies.empty')}</div>
      )}

      {!loading && !error && enemies.length > 0 && (
        <EnemyEncyclopedia
          enemies={enemies}
          showDebug={isAdmin}
          items={items}
          selectedId={selectedEnemyId}
          onSelectedIdChange={setSelectedEnemyId}
          onSaved={handleEnemySaved}
        />
      )}
    </div>
  );
}
