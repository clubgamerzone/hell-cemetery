import { useEffect, useMemo, useRef, useState } from 'react';
import GothicButton from './GothicButton';
import { saveContentNode } from '../firebase/databaseService';
import styles from './EnemyAdminEditor.module.css';

const STAT_FIELDS = {
  health: ['healthPoints', 'health', 'hp', 'HP', 'maxHealth', 'maxHP'],
  defense: ['defense', 'Defense', 'defence'],
  speed: ['speed', 'Speed', 'moveSpeed'],
  damage: ['damageToGive', 'damage', 'Damage', 'attackDamage'],
  experience: ['experienceToGive', 'experience', 'Experience', 'xp', 'XP'],
};

const RESISTANCE_FIELDS = [
  ['fireDamageTakenPercent', 'Fire'],
  ['iceDamageTakenPercent', 'Ice'],
  ['lightningDamageTakenPercent', 'Lightning'],
  ['poisonDamageTakenPercent', 'Poison'],
  ['holyDamageTakenPercent', 'Holy'],
  ['darkDamageTakenPercent', 'Dark'],
  ['arcaneDamageTakenPercent', 'Arcane'],
];

const DROP_KEYS = [
  'lootDrops',
  'drops',
  'commonDrops',
  'normalDrops',
  'uncommonDrops',
  'rareDrops',
  'veryRareDrops',
  'legendaryDrops',
];

function clone(value) {
  return JSON.parse(JSON.stringify(value ?? {}));
}

function pickExistingKey(data, keys, fallback) {
  return keys.find((key) => data[key] !== undefined) || fallback || keys[0];
}

function getNumber(data, keys) {
  const key = pickExistingKey(data, keys);
  const value = data[key];
  return value === undefined || value === null || value === '' ? '' : String(value);
}

function getDropKey(data) {
  return DROP_KEYS.find((key) => Array.isArray(data[key])) || 'lootDrops';
}

function normalizeDrops(data) {
  const key = getDropKey(data);
  const drops = Array.isArray(data[key]) ? data[key] : [];
  return drops.map((drop) => {
    if (typeof drop !== 'object' || drop === null) {
      return {
        itemKey: String(drop),
        itemName: String(drop),
        itemID: '',
        dropChance: '',
        minAmount: '',
        maxAmount: '',
        dropTier: '',
        isGuaranteed: false,
      };
    }

    const itemKey = drop.itemID ?? drop.itemId ?? drop.itemName ?? drop.name ?? '';
    return {
      ...drop,
      itemKey: String(itemKey),
      itemName: drop.itemName || drop.name || String(itemKey),
      itemID: drop.itemID ?? drop.itemId ?? '',
      dropChance: drop.dropChance ?? drop.chance ?? '',
      minAmount: drop.minAmount ?? '',
      maxAmount: drop.maxAmount ?? '',
      dropTier: drop.dropTier || drop.tier || '',
      isGuaranteed: Boolean(drop.isGuaranteed),
    };
  });
}

function toNumberOrBlank(value) {
  if (value === '' || value === null || value === undefined) return '';
  const parsed = Number(value);
  return Number.isNaN(parsed) ? value : parsed;
}

function stripDataUri(dataUrl) {
  const [header, base64] = String(dataUrl).split(',');
  const mimeType = header.match(/^data:(.+);base64$/)?.[1] || 'image/png';
  return { base64, mimeType };
}

export default function EnemyAdminEditor({
  enemy,
  items,
  openSection,
  onClose,
  onSaved,
  validate,
}) {
  const fileInputRef = useRef(null);
  const [draft, setDraft] = useState(() => clone(enemy.raw));
  const [drops, setDrops] = useState(() => normalizeDrops(enemy.raw));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const itemOptions = useMemo(
    () => items.map((item) => ({
      key: String(item.itemId || item.firebaseKey || item.itemName),
      label: item.itemName,
      item,
    })),
    [items],
  );

  useEffect(() => {
    setDraft(clone(enemy.raw));
    setDrops(normalizeDrops(enemy.raw));
    setError('');
    setMessage('');
  }, [enemy]);

  function setField(key, value) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function setNumberField(keys, value) {
    const key = pickExistingKey(draft, keys);
    setField(key, toNumberOrBlank(value));
  }

  function setDrop(index, patch) {
    setDrops((current) => current.map((drop, dropIndex) => (
      dropIndex === index ? { ...drop, ...patch } : drop
    )));
  }

  function handleItemSelect(index, selectedKey) {
    const selected = itemOptions.find((option) => option.key === selectedKey);
    if (!selected) {
      setDrop(index, { itemKey: '', itemID: '', itemName: '' });
      return;
    }

    setDrop(index, {
      itemKey: selected.key,
      itemID: selected.item.itemId || selected.item.firebaseKey,
      itemName: selected.item.itemName,
    });
  }

  function addDrop() {
    const firstItem = itemOptions[0];
    setDrops((current) => [
      ...current,
      {
        itemKey: firstItem?.key || '',
        itemID: firstItem?.item.itemId || firstItem?.item.firebaseKey || '',
        itemName: firstItem?.item.itemName || '',
        dropChance: 1,
        minAmount: 1,
        maxAmount: 1,
        dropTier: '',
        isGuaranteed: false,
      },
    ]);
  }

  async function handleImageChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const { base64, mimeType } = stripDataUri(reader.result);
      setDraft((current) => ({
        ...current,
        encyclopediaPortraitBase64: base64,
        encyclopediaPortraitMimeType: mimeType,
      }));
    };
    reader.readAsDataURL(file);
  }

  function buildSaveData() {
    const next = clone(draft);
    const dropKey = getDropKey(next);
    next[dropKey] = drops.map(({ itemKey, itemID, itemName, dropChance, minAmount, maxAmount, dropTier, isGuaranteed }) => ({
      itemID,
      itemName,
      dropChance: toNumberOrBlank(dropChance),
      minAmount: toNumberOrBlank(minAmount),
      maxAmount: toNumberOrBlank(maxAmount),
      dropTier,
      isGuaranteed: Boolean(isGuaranteed),
    }));
    return next;
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const next = buildSaveData();
      const validationError = validate?.(next);
      if (validationError) {
        setError(validationError);
        return;
      }

      await saveContentNode(enemy.writePath, next);
      setMessage('Saved.');
      onSaved?.();
    } catch {
      setError('Save failed.');
    } finally {
      setSaving(false);
    }
  }

  if (!openSection) return null;

  return (
    <section className={styles.editor}>
      <div className={styles.header}>
        <h3>Edit Enemy</h3>
        <button type="button" className={styles.closeButton} onClick={onClose}>Close</button>
      </div>

      <div className={styles.grid}>
        {(openSection === 'identity' || openSection === 'portrait') && (
          <>
            <div className={styles.imageEditor}>
              <button
                type="button"
                className={styles.imageButton}
                onClick={() => fileInputRef.current?.click()}
              >
                <img
                  src={
                    draft.encyclopediaPortraitBase64
                      ? `data:${draft.encyclopediaPortraitMimeType || 'image/png'};base64,${draft.encyclopediaPortraitBase64}`
                      : enemy.imageUrl
                  }
                  alt=""
                />
                <span>Edit image</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className={styles.fileInput}
                onChange={handleImageChange}
              />
            </div>

            <label className={styles.field}>
              <span>Name</span>
              <input
                value={draft.enemyName || draft.name || ''}
                onChange={(event) => setField(pickExistingKey(draft, ['enemyName', 'name'], 'enemyName'), event.target.value)}
              />
            </label>
            <label className={styles.field}>
              <span>Creature type</span>
              <input
                value={draft.enemyFamily || ''}
                onChange={(event) => setField('enemyFamily', event.target.value)}
              />
            </label>
            <label className={styles.field}>
              <span>Category</span>
              <input
                value={draft.category || enemy.category || ''}
                onChange={(event) => setField('category', event.target.value)}
              />
            </label>
            <label className={styles.field}>
              <span>Attack element</span>
              <input
                value={draft.attackElement || ''}
                onChange={(event) => setField('attackElement', event.target.value)}
              />
            </label>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={Boolean(draft.isBoss)}
                onChange={(event) => setField('isBoss', event.target.checked)}
              />
              <span>Boss enemy</span>
            </label>
          </>
        )}

        {openSection === 'stats' && (
          Object.entries(STAT_FIELDS).map(([key, keys]) => (
            <label key={key} className={styles.field}>
              <span>{key}</span>
              <input
                type="number"
                step="any"
                value={getNumber(draft, keys)}
                onChange={(event) => setNumberField(keys, event.target.value)}
              />
            </label>
          ))
        )}

        {openSection === 'resistances' && (
          RESISTANCE_FIELDS.map(([key, label]) => (
            <label key={key} className={styles.field}>
              <span>{label} damage taken %</span>
              <input
                type="number"
                step="any"
                value={draft[key] ?? ''}
                onChange={(event) => setField(key, toNumberOrBlank(event.target.value))}
              />
            </label>
          ))
        )}

        {openSection === 'loot' && (
          <div className={styles.full}>
            <div className={styles.sectionHeader}>
              <h4>Loot Drops</h4>
              <GothicButton type="button" size="small" onClick={addDrop}>Add Drop</GothicButton>
            </div>
            <div className={styles.dropList}>
              {drops.map((drop, index) => (
                <div key={`${drop.itemKey}-${index}`} className={styles.dropRow}>
                  <label className={styles.field}>
                    <span>Item</span>
                    <select
                      value={drop.itemKey}
                      onChange={(event) => handleItemSelect(index, event.target.value)}
                    >
                      <option value="">Select item</option>
                      {itemOptions.map((option) => (
                        <option key={option.key} value={option.key}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className={styles.field}>
                    <span>Chance</span>
                    <input
                      type="number"
                      step="any"
                      value={drop.dropChance}
                      onChange={(event) => setDrop(index, { dropChance: event.target.value })}
                    />
                  </label>
                  <label className={styles.field}>
                    <span>Min</span>
                    <input
                      type="number"
                      step="1"
                      value={drop.minAmount}
                      onChange={(event) => setDrop(index, { minAmount: event.target.value })}
                    />
                  </label>
                  <label className={styles.field}>
                    <span>Max</span>
                    <input
                      type="number"
                      step="1"
                      value={drop.maxAmount}
                      onChange={(event) => setDrop(index, { maxAmount: event.target.value })}
                    />
                  </label>
                  <label className={styles.field}>
                    <span>Tier</span>
                    <input
                      value={drop.dropTier}
                      onChange={(event) => setDrop(index, { dropTier: event.target.value })}
                    />
                  </label>
                  <label className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={Boolean(drop.isGuaranteed)}
                      onChange={(event) => setDrop(index, { isGuaranteed: event.target.checked })}
                    />
                    <span>Guaranteed</span>
                  </label>
                  <button
                    type="button"
                    className={styles.removeButton}
                    onClick={() => setDrops((current) => current.filter((_, dropIndex) => dropIndex !== index))}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {openSection === 'lore' && (
          <label className={`${styles.field} ${styles.full}`}>
            <span>Lore</span>
            <textarea
              value={draft.description || draft.lore || ''}
              onChange={(event) => setField(pickExistingKey(draft, ['description', 'lore'], 'description'), event.target.value)}
            />
          </label>
        )}
      </div>

      {error && <p className={styles.error}>{error}</p>}
      {message && <p className={styles.message}>{message}</p>}

      <div className={styles.actions}>
        <GothicButton type="button" size="small" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Enemy'}
        </GothicButton>
        <GothicButton type="button" size="small" variant="ghost" onClick={onClose} disabled={saving}>
          Cancel
        </GothicButton>
      </div>
    </section>
  );
}
