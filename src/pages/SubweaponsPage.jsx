import { useEffect, useState } from 'react';
import { getSubweaponSettings, saveContentNode, saveMissingContentNodes } from '../firebase/databaseService';
import { ELEMENTS, normalizeSubweaponSettings } from '../utils/subweaponParser';
import { useAuth } from '../context/AuthContext';
import GothicButton from '../components/GothicButton';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import styles from './SubweaponsPage.module.css';

const numeric = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;

export default function SubweaponsPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [subweapons, setSubweapons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const missing = subweapons.filter((value) => !value.existsInFirebase);

  async function load() {
    setLoading(true); setError('');
    try { setSubweapons(normalizeSubweaponSettings(await getSubweaponSettings())); }
    catch { setError('Unable to load subweapon settings.'); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    if (!authLoading && isAdmin) load();
    else if (!authLoading) setLoading(false);
  }, [authLoading, isAdmin]);

  function beginEdit(value) {
    setEditing({ ...value.defaults, ...value.raw, id: value.id, writePath: value.writePath });
    setMessage('');
  }
  function setField(field, value) { setEditing((current) => ({ ...current, [field]: value })); }
  async function save() {
    setSaving(true); setMessage('');
    try {
      const { writePath, ...data } = editing;
      await saveContentNode(writePath, data);
      setEditing(null);
      setMessage('Subweapon saved. Unity will use it the next time configuration loads.');
      await load();
    } catch { setMessage('Save failed. Check the admin Firebase permissions.'); }
    finally { setSaving(false); }
  }

  async function initializeMissing() {
    setSaving(true); setMessage('');
    try {
      const updates = Object.fromEntries(missing.map((value) => [value.writePath, value.defaults]));
      const result = await saveMissingContentNodes(updates);
      setMessage(`Added ${result.written} missing subweapon${result.written === 1 ? '' : 's'}; skipped ${result.skipped} existing value${result.skipped === 1 ? '' : 's'}.`);
      await load();
    } catch {
      setMessage('Firebase rejected the initialization. Publish the SubweaponSettings database rule, then try again.');
    } finally { setSaving(false); }
  }

  if (authLoading) return <LoadingSpinner message="Checking admin access..." />;
  if (!isAdmin) return <div className="page"><div className="empty-state">Administrator access is required.</div></div>;

  return <div className="page page--wide">
    <div className="page-header"><h1>Subweapons</h1><p>Player projectile damage, resource costs, and combat element loaded by Unity from Firebase.</p></div>
    {loading && <LoadingSpinner message="Loading subweapons..." />}
    <ErrorMessage message={error} onRetry={load} />
    {message && <div className="notice notice--info">{message}</div>}
    {isAdmin && !loading && missing.length > 0 && <div className="notice notice--warning" style={{ marginBottom: '1.25rem' }}><p>{missing.length} subweapon{missing.length === 1 ? ' is' : 's are'} using prefab defaults and not stored in Firebase yet.</p><GothicButton size="small" onClick={initializeMissing} disabled={saving}>{saving ? 'Adding...' : 'Add missing defaults to Firebase'}</GothicButton></div>}
    {!loading && !error && <div className={styles.grid}>{subweapons.map((value) => <article key={value.id} className={styles.card}>
      <div className={styles.heading}><h2>{value.displayName}</h2><span className={value.existsInFirebase ? styles.remote : styles.fallback}>{value.existsInFirebase ? 'Firebase' : 'Prefab default'}</span></div>
      <p>{value.description}</p>
      <dl className={styles.stats}><div><dt>Base damage</dt><dd>{value.baseDamage}</dd></div><div><dt>Element</dt><dd>{value.elementLabel}</dd></div><div><dt>Heart cost</dt><dd>{value.heartCost}</dd></div><div><dt>Stamina cost</dt><dd>{value.staminaCost}</dd></div></dl>
      {isAdmin && <GothicButton size="small" onClick={() => beginEdit(value)}>Edit</GothicButton>}
    </article>)}</div>}
    {editing && <div className={styles.overlay} onMouseDown={() => !saving && setEditing(null)}><section className={styles.modal} role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
      <h2>Edit {editing.displayName}</h2>
      <label><span>Name</span><input value={editing.displayName || ''} onChange={(event) => setField('displayName', event.target.value)} /></label>
      <label><span>Description</span><textarea value={editing.description || ''} onChange={(event) => setField('description', event.target.value)} /></label>
      <div className={styles.formGrid}>
        <label><span>Base damage</span><input type="number" min="0" step="any" value={editing.baseDamage} onChange={(event) => setField('baseDamage', numeric(event.target.value))} /></label>
        <label><span>Element</span><select value={editing.element} onChange={(event) => setField('element', numeric(event.target.value))}>{ELEMENTS.map((name, index) => <option key={name} value={index}>{name}</option>)}</select></label>
        <label><span>Heart cost</span><input type="number" min="0" step="1" value={editing.heartCost} onChange={(event) => setField('heartCost', numeric(event.target.value))} /></label>
        <label><span>Stamina cost</span><input type="number" min="0" step="1" value={editing.staminaCost} onChange={(event) => setField('staminaCost', numeric(event.target.value))} /></label>
      </div>
      <label className={styles.checkbox}><input type="checkbox" checked={editing.enabled !== false} onChange={(event) => setField('enabled', event.target.checked)} /><span>Enabled</span></label>
      <div className={styles.actions}><GothicButton size="small" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Subweapon'}</GothicButton><GothicButton size="small" variant="ghost" onClick={() => setEditing(null)} disabled={saving}>Cancel</GothicButton></div>
    </section></div>}
  </div>;
}
