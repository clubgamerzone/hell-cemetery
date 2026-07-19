import { useEffect, useState } from 'react';
import {
  getEnemySettings,
  getItems,
  normalizeEnemies,
  normalizeItemSettings,
  saveMissingContentNodes,
} from '../firebase/databaseService';
import EnemyEncyclopedia from '../components/EnemyEncyclopedia';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import GothicButton from '../components/GothicButton';
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
  const [damagePreview, setDamagePreview] = useState(null);
  const [applyingDamageDefaults, setApplyingDamageDefaults] = useState(false);
  const [damageMessage, setDamageMessage] = useState('');

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

  function buildMissingDamagePreview() {
    const updates = {};
    const rows = [];

    enemies.forEach((enemy) => {
      const defaults = enemy.prefabDamageDefaults;
      if (!defaults || !enemy.writePath) return;

      const fields = [];
      if ((enemy.raw?.meleeDamage === undefined || enemy.raw?.meleeDamage === null) && defaults.meleeDamage >= 0) {
        updates[`${enemy.writePath}/meleeDamage`] = defaults.meleeDamage;
        fields.push(`Melee ${defaults.meleeDamage}`);
      }
      if ((enemy.raw?.projectileDamage === undefined || enemy.raw?.projectileDamage === null) && defaults.projectileDamage >= 0) {
        updates[`${enemy.writePath}/projectileDamage`] = defaults.projectileDamage;
        fields.push(`Projectile ${defaults.projectileDamage}`);
      }
      if (fields.length > 0) rows.push({ id: enemy.id, name: enemy.name, fields });
    });

    setDamageMessage('');
    setDamagePreview({ updates, rows });
  }

  async function applyMissingDamageDefaults() {
    if (!damagePreview || Object.keys(damagePreview.updates).length === 0) return;
    setApplyingDamageDefaults(true);
    setDamageMessage('');
    try {
      const result = await saveMissingContentNodes(damagePreview.updates);
      setDamagePreview(null);
      setDamageMessage(
        `Added ${result.written} missing damage value${result.written === 1 ? '' : 's'}. ` +
        `${result.skipped} value${result.skipped === 1 ? ' was' : 's were'} skipped because Firebase already contained data.`,
      );
      await loadEnemies(selectedEnemyId);
    } catch {
      setDamageMessage('Unable to save the missing damage defaults. No existing fields were intentionally replaced.');
    } finally {
      setApplyingDamageDefaults(false);
    }
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

      {isAdmin && !loading && !error && enemies.length > 0 && (
        <div className="notice notice--warning" style={{ marginBottom: '1.25rem' }}>
          <strong>Prefab damage defaults</strong>
          <p style={{ margin: '0.5rem 0' }}>
            Review missing melee and projectile values before adding them to Firebase. Existing values and all other enemy data are left unchanged.
          </p>
          {!damagePreview && (
            <GothicButton size="small" onClick={buildMissingDamagePreview}>
              Review missing damage defaults
            </GothicButton>
          )}
          {damagePreview && (
            <div>
              <p>
                {damagePreview.rows.length === 0
                  ? 'Every available prefab damage value is already present in Firebase.'
                  : `${Object.keys(damagePreview.updates).length} missing fields across ${damagePreview.rows.length} enemies will be added:`}
              </p>
              {damagePreview.rows.length > 0 && (
                <ul style={{ maxHeight: '15rem', overflow: 'auto', paddingLeft: '1.25rem' }}>
                  {damagePreview.rows.map((row) => (
                    <li key={row.id}><strong>{row.name}:</strong> {row.fields.join(', ')}</li>
                  ))}
                </ul>
              )}
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {damagePreview.rows.length > 0 && (
                  <GothicButton size="small" onClick={applyMissingDamageDefaults} disabled={applyingDamageDefaults}>
                    {applyingDamageDefaults ? 'Adding missing values...' : 'Add only these missing values'}
                  </GothicButton>
                )}
                <GothicButton size="small" variant="ghost" onClick={() => setDamagePreview(null)} disabled={applyingDamageDefaults}>
                  Cancel
                </GothicButton>
              </div>
            </div>
          )}
          {damageMessage && <p style={{ marginBottom: 0 }}>{damageMessage}</p>}
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
