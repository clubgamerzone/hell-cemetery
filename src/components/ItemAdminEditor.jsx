import { useEffect, useRef, useState } from 'react';
import itemPlaceholder from '../assets/images/item-placeholder.svg';
import { saveContentNode } from '../firebase/databaseService';
import GothicButton from './GothicButton';
import styles from './ItemAdminEditor.module.css';

const ITEM_TYPES = [
  [0, 'Usable'],
  [1, 'Weapon'],
  [2, 'Armor'],
  [3, 'Helmet'],
  [4, 'Boots'],
  [5, 'Ring'],
  [6, 'Amulet'],
  [7, 'Legs'],
  [8, 'Shield'],
  [9, 'Material'],
  [10, 'Quest'],
  [11, 'Misc'],
];

const RARITIES = [
  [0, 'Common'],
  [1, 'Normal'],
  [2, 'Uncommon'],
  [3, 'Rare'],
  [4, 'Unique'],
  [5, 'Legendary'],
];

const STAT_SECTIONS = [
  {
    title: 'Healing / Instant Use',
    fields: [
      ['healthToGive', 'Healing'],
      ['stamineToGive', 'Stamina'],
      ['heartsToGive', 'Hearts Restored'],
    ],
  },
  {
    title: 'Permanent Character Increases',
    fields: [
      ['strenghtToIncrease', 'Strength'],
      ['heartsToIncrease', 'Hearts'],
      ['healthToIncrease', 'Health'],
      ['stamineToIncrease', 'Max Stamina'],
    ],
  },
  {
    title: 'Equipment Stats',
    fields: [
      ['weaponDamageIncrease', 'Weapon Damage'],
      ['subweaponDamageMult', 'Subweapon Damage'],
      ['maxHealthToIncrease', 'Max Health'],
      ['defToIncrease', 'Defense'],
    ],
  },
  {
    title: 'Temporary Effects',
    fields: [
      ['temporaryEffectDurationMinutes', 'Duration Minutes'],
      ['temporaryAttackBonus', 'Timed Attack'],
      ['temporaryDefenseBonus', 'Timed Defense'],
      ['temporaryMaxStaminaBonus', 'Timed Max Stamina'],
      ['temporaryMaxHealthBonus', 'Timed Max Health'],
      ['temporaryMaxHeartsBonus', 'Timed Hearts'],
      ['temporarySubweaponDamageMultiplierBonus', 'Timed Subweapon Mult'],
    ],
  },
  {
    title: 'Enemy Family Damage Bonuses',
    fields: [
      ['bonusDamageToUndeadPercent', 'Damage to Undead %'],
      ['bonusDamageToDemonPercent', 'Damage to Demon %'],
      ['bonusDamageToBeastPercent', 'Damage to Beast %'],
      ['bonusDamageToHumanPercent', 'Damage to Human %'],
      ['bonusDamageToConstructPercent', 'Damage to Construct %'],
      ['bonusDamageToSpiritPercent', 'Damage to Spirit %'],
      ['bonusDamageToInsectPercent', 'Damage to Insect %'],
      ['bonusDamageToPlantPercent', 'Damage to Plant %'],
      ['bonusDamageToAquaticPercent', 'Damage to Aquatic %'],
      ['bonusDamageToDragonPercent', 'Damage to Dragon %'],
      ['bonusDamageToAberrationPercent', 'Damage to Aberration %'],
    ],
  },
  {
    title: 'Elemental Damage',
    fields: [
      ['physicalDamage', 'Physical Damage'],
      ['fireDamage', 'Fire Damage'],
      ['iceDamage', 'Ice Damage'],
      ['lightningDamage', 'Lightning Damage'],
      ['poisonDamage', 'Poison Damage'],
      ['holyDamage', 'Holy Damage'],
      ['darkDamage', 'Dark Damage'],
      ['arcaneDamage', 'Arcane Damage'],
    ],
  },
  {
    title: 'Elemental / Physical Defense',
    fields: [
      ['physicalDefensePercent', 'Physical Defense %'],
      ['fireDefensePercent', 'Fire Defense %'],
      ['iceDefensePercent', 'Ice Defense %'],
      ['lightningDefensePercent', 'Lightning Defense %'],
      ['poisonDefensePercent', 'Poison Defense %'],
      ['holyDefensePercent', 'Holy Defense %'],
      ['darkDefensePercent', 'Dark Defense %'],
      ['arcaneDefensePercent', 'Arcane Defense %'],
    ],
  },
];

function clone(value) {
  return JSON.parse(JSON.stringify(value ?? {}));
}

function pickExistingKey(data, keys, fallback) {
  return keys.find((key) => data[key] !== undefined) || fallback || keys[0];
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

function getImageUrl(draft, fallback) {
  if (draft.imageBase64) {
    return String(draft.imageBase64).startsWith('data:')
      ? draft.imageBase64
      : `data:${draft.imageMimeType || 'image/png'};base64,${draft.imageBase64}`;
  }
  return draft.imageUrl || draft.image || fallback || itemPlaceholder;
}

export default function ItemAdminEditor({ item, onClose, onSaved, compactHeader = false }) {
  const fileInputRef = useRef(null);
  const [draft, setDraft] = useState(() => clone(item.raw));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    setDraft(clone(item.raw));
    setError('');
    setMessage('');
  }, [item]);

  function setField(key, value) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function handleImageChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const { base64, mimeType } = stripDataUri(reader.result);
      setDraft((current) => ({
        ...current,
        imageBase64: base64,
        imageMimeType: mimeType,
      }));
    };
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    setMessage('');

    try {
      await saveContentNode(item.writePath, draft);
      setMessage('Saved.');
      onSaved?.();
    } catch {
      setError('Save failed.');
    } finally {
      setSaving(false);
    }
  }

  const nameKey = pickExistingKey(draft, ['itemName', 'name'], 'itemName');

  return (
    <section className={styles.editor}>
      {!compactHeader && (
        <div className={styles.header}>
          <h3>Edit Item</h3>
          <button type="button" className={styles.closeButton} onClick={onClose}>Close</button>
        </div>
      )}

      <div className={styles.grid}>
        <div className={styles.imageEditor}>
          <button
            type="button"
            className={styles.imageButton}
            onClick={() => fileInputRef.current?.click()}
            title="Upload item image"
          >
            <img
              src={getImageUrl(draft, item.imageUrl)}
              alt=""
              onError={(event) => {
                event.currentTarget.src = itemPlaceholder;
              }}
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
            value={draft[nameKey] || ''}
            onChange={(event) => setField(nameKey, event.target.value)}
          />
        </label>

        <label className={styles.field}>
          <span>Type</span>
          <select
            value={draft.itemType ?? ''}
            onChange={(event) => setField('itemType', toNumberOrBlank(event.target.value))}
          >
            <option value="">Unknown</option>
            {ITEM_TYPES.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span>Rarity</span>
          <select
            value={draft.rarity ?? ''}
            onChange={(event) => setField('rarity', toNumberOrBlank(event.target.value))}
          >
            <option value="">Use default</option>
            {RARITIES.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span>Max stack</span>
          <input
            type="number"
            step="1"
            value={draft.maxStack ?? ''}
            onChange={(event) => setField('maxStack', toNumberOrBlank(event.target.value))}
          />
        </label>

        <label className={`${styles.field} ${styles.full}`}>
          <span>Description / Lore</span>
          <textarea
            value={draft.description || ''}
            onChange={(event) => setField('description', event.target.value)}
          />
        </label>

        <div className={styles.toggleRow}>
          {['craftable', 'tradeable', 'tradeLocked'].map((key) => (
            <label key={key} className={styles.checkbox}>
              <input
                type="checkbox"
                checked={Boolean(draft[key])}
                onChange={(event) => setField(key, event.target.checked)}
              />
              <span>{key.replace(/([A-Z])/g, ' $1')}</span>
            </label>
          ))}
        </div>

        <div className={styles.full}>
          <h4 className={styles.subheading}>Stats</h4>
          <div className={styles.statSections}>
            {STAT_SECTIONS.map((section) => (
              <section key={section.title} className={styles.statSection}>
                <h5>{section.title}</h5>
                <div className={styles.statsGrid}>
                  {section.fields.map(([key, label]) => (
                    <label key={key} className={styles.field}>
                      <span>{label}</span>
                      <input
                        type="number"
                        step="any"
                        value={draft[key] ?? ''}
                        onChange={(event) => setField(key, toNumberOrBlank(event.target.value))}
                      />
                    </label>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}
      {message && <p className={styles.message}>{message}</p>}

      <div className={styles.actions}>
        <GothicButton type="button" size="small" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Item'}
        </GothicButton>
        <GothicButton type="button" size="small" variant="ghost" onClick={onClose} disabled={saving}>
          Cancel
        </GothicButton>
      </div>
    </section>
  );
}
