import { useEffect, useMemo, useState } from 'react';
import { getGameBalanceSettings, saveContentNode } from '../firebase/databaseService';
import { useAuth } from '../context/AuthContext';
import GothicButton from '../components/GothicButton';
import LoadingSpinner from '../components/LoadingSpinner';
import styles from './BalanceSettingsPage.module.css';

const DEFAULTS = { lootRate: 1, experienceRate: 1, respawnRate: 1, additionalRespawnSeconds: 0 };
const numberOrZero = (value) => Math.max(0, Number(value) || 0);

export default function BalanceSettingsPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [draft, setDraft] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [exists, setExists] = useState(false);

  useEffect(() => {
    getGameBalanceSettings().then((data) => {
      setExists(Boolean(data));
      setDraft({ ...DEFAULTS, ...(data || {}) });
    }).catch(() => setMessage('Firebase rejected the read. Publish the GameBalanceSettings rule.')).finally(() => setLoading(false));
  }, []);

  const exampleDelay = useMemo(() => 50 * numberOrZero(draft.respawnRate) + numberOrZero(draft.additionalRespawnSeconds), [draft]);
  const setField = (field, value) => setDraft((current) => ({ ...current, [field]: numberOrZero(value) }));

  async function save() {
    setSaving(true); setMessage('');
    try {
      const clean = Object.fromEntries(Object.keys(DEFAULTS).map((key) => [key, numberOrZero(draft[key])]));
      await saveContentNode('GameBalanceSettings', clean);
      setDraft(clean); setExists(true); setMessage('Global balance settings saved. Unity will apply them when the game loads configuration.');
    } catch { setMessage('Firebase rejected the save. Publish the GameBalanceSettings admin-write rule and try again.'); }
    finally { setSaving(false); }
  }

  if (authLoading) return <LoadingSpinner message="Checking admin access..." />;
  if (!isAdmin) return <div className="page"><div className="empty-state">Administrator access is required.</div></div>;

  return <div className="page">
    <div className="page-header"><h1>Global Balance Settings</h1><p>Global multipliers applied after each enemy's normal configuration.</p></div>
    {loading ? <LoadingSpinner message="Loading balance settings..." /> : <section className={styles.panel}>
      <div className="notice notice--info">{exists ? 'Values loaded from Firebase.' : 'Firebase has no balance object yet. These are safe defaults; Save will create it.'}</div>
      <div className={styles.grid}>
        <label><span>Loot rate multiplier</span><input type="number" min="0" step="0.1" value={draft.lootRate} onChange={(event) => setField('lootRate', event.target.value)} /><small>2 doubles each drop chance, capped at 100%.</small></label>
        <label><span>Experience rate multiplier</span><input type="number" min="0" step="0.1" value={draft.experienceRate} onChange={(event) => setField('experienceRate', event.target.value)} /><small>2 awards twice the normal enemy experience.</small></label>
        <label><span>Respawn time multiplier</span><input type="number" min="0" step="0.1" value={draft.respawnRate} onChange={(event) => setField('respawnRate', event.target.value)} /><small>2 makes the normal respawn delay twice as long.</small></label>
        <label><span>Additional general respawn seconds</span><input type="number" min="0" step="1" value={draft.additionalRespawnSeconds} onChange={(event) => setField('additionalRespawnSeconds', event.target.value)} /><small>Added after multiplying the enemy's normal delay.</small></label>
      </div>
      <div className={styles.example}>Example for a 50-second enemy: <strong>{draft.respawnRate} × 50 + {draft.additionalRespawnSeconds} = {exampleDelay} seconds</strong></div>
      {message && <div className="notice notice--warning">{message}</div>}
      <GothicButton onClick={save} disabled={saving}>{saving ? 'Saving...' : exists ? 'Save Balance Settings' : 'Create Balance Settings in Firebase'}</GothicButton>
    </section>}
  </div>;
}
