import { useEffect, useMemo, useRef, useState } from 'react';
import GothicButton from './GothicButton';
import { deleteContentNode, saveContentNode } from '../firebase/databaseService';
import { formatBytes, reduceStoredImage, sanitizeStorageSegment, uploadEditorImage } from '../utils/storageImages';
import styles from './EnemyAdminEditor.module.css';

const COMBAT_STAT_FIELDS = [
  ['healthPoints', 'Health Points', ['healthPoints', 'health', 'hp', 'HP', 'maxHealth', 'maxHP']],
  ['defense', 'Defense', ['defense', 'Defense', 'defence']],
  ['speed', 'Speed', ['speed', 'Speed', 'moveSpeed']],
  ['knockbackForceX', 'Knockback X', ['knockbackForceX']],
  ['knockbackForceY', 'Knockback Y', ['knockbackForceY']],
  ['damageToGive', 'Damage', ['damageToGive', 'damage', 'Damage', 'attackDamage']],
  ['experienceToGive', 'Experience', ['experienceToGive', 'experience', 'Experience', 'xp', 'XP']],
];

const RESPAWN_FIELDS = [
  ['timeToRespawn', 'Respawn Time'],
];

const MOVEMENT_FIELDS = [
  ['detectionRadius', 'Detection Radius'],
  ['pursuitMultiplier', 'Pursuit Multiplier'],
  ['timeToWait', 'Wait Time'],
  ['timeToReset', 'Reset Time'],
];

const BEHAVIOR_TYPES = [
  [0, 'Static / Idle'],
  [1, 'Follow / Walker'],
  [2, 'Patrol'],
];

const ENEMY_FAMILIES = [
  'DEFAULT',
  'UNDEAD',
  'DEMON',
  'BEAST',
  'HUMAN',
  'CONSTRUCT',
  'SPIRIT',
  'INSECT',
  'PLANT',
  'AQUATIC',
  'DRAGON',
  'ABERRATION',
];

const COMBAT_ELEMENTS = [
  'PHYSICAL',
  'FIRE',
  'ICE',
  'LIGHTNING',
  'POISON',
  'HOLY',
  'DARK',
  'ARCANE',
];

const RESISTANCE_FIELDS = [
  ['physicalDamageTakenPercent', 'Physical'],
  ['fireDamageTakenPercent', 'Fire'],
  ['iceDamageTakenPercent', 'Ice'],
  ['lightningDamageTakenPercent', 'Lightning'],
  ['poisonDamageTakenPercent', 'Poison'],
  ['holyDamageTakenPercent', 'Holy'],
  ['darkDamageTakenPercent', 'Dark'],
  ['arcaneDamageTakenPercent', 'Arcane'],
];

const DROP_KEYS = [
  'commonDrops',
  'normalDrops',
  'uncommonDrops',
  'rareDrops',
  'veryRareDrops',
  'legendaryDrops',
  'lootDrops',
  'drops',
];

const DROP_LIST_LABELS = {
  commonDrops: 'Common drops',
  normalDrops: 'Normal drops',
  uncommonDrops: 'Uncommon drops',
  rareDrops: 'Rare drops',
  veryRareDrops: 'Very rare drops',
  legendaryDrops: 'Legendary drops',
  lootDrops: 'Legacy loot drops',
  drops: 'Legacy drops',
};

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

function getItemAliases(item) {
  return [
    item.itemName,
    item.itemId,
    item.firebaseKey,
    item.id,
  ].filter(Boolean).map(String);
}

function findItemOption(itemOptions, value) {
  if (value === '' || value === null || value === undefined) return null;
  const text = String(value);
  return itemOptions.find((option) => option.aliases.includes(text)) || null;
}

function resolveDropItemKey(drop, itemOptions) {
  const candidates = [
    drop?.itemName,
    drop?.itemId,
    drop?.itemID,
    drop?.name,
    drop,
  ];
  const matched = candidates.map((candidate) => findItemOption(itemOptions, candidate)).find(Boolean);
  if (matched) return matched.key;
  return String(candidates.find((candidate) => candidate !== undefined && candidate !== null && candidate !== '') || '');
}

function normalizeDrop(drop, sourceKey, itemOptions) {
  if (typeof drop !== 'object' || drop === null) {
    return {
      sourceKey,
      itemKey: resolveDropItemKey(drop, itemOptions),
      itemName: String(drop),
      itemID: '',
      dropChance: '',
      minAmount: '',
      maxAmount: '',
      dropTier: '',
      isGuaranteed: false,
    };
  }

  return {
    ...drop,
    sourceKey,
    itemKey: resolveDropItemKey(drop, itemOptions),
    itemName: drop.itemName || drop.name || '',
    itemId: drop.itemId || (isNumericValue(drop.itemID) ? '' : drop.itemID) || '',
    itemID: isNumericValue(drop.itemID) ? drop.itemID : '',
    dropChance: drop.dropChance ?? drop.chance ?? '',
    minAmount: drop.minAmount ?? '',
    maxAmount: drop.maxAmount ?? '',
    dropTier: drop.dropTier || drop.tier || '',
    isGuaranteed: Boolean(drop.isGuaranteed),
  };
}

function normalizeDrops(data, itemOptions = []) {
  const drops = DROP_KEYS.flatMap((key) => {
    const list = Array.isArray(data[key]) ? data[key] : [];
    return list.map((drop) => normalizeDrop(drop, key, itemOptions));
  });

  if (drops.length > 0) return drops;

  const key = getDropKey(data);
  return (Array.isArray(data[key]) ? data[key] : []).map((drop) => normalizeDrop(drop, key, itemOptions));
}

function buildDropSaveData(drop) {
  return {
    itemId: drop.itemId || '',
    itemID: toNumberOrZero(drop.itemID),
    itemName: drop.itemName,
    dropChance: toNumberOrBlank(drop.dropChance),
    minAmount: toNumberOrBlank(drop.minAmount),
    maxAmount: toNumberOrBlank(drop.maxAmount),
    dropTier: drop.dropTier,
    isGuaranteed: Boolean(drop.isGuaranteed),
  };
}

function getUsedDropKeys(data, drops) {
  const existingKeys = DROP_KEYS.filter((key) => Array.isArray(data[key]));
  const editedKeys = drops.map((drop) => drop.sourceKey).filter(Boolean);
  return Array.from(new Set([...existingKeys, ...editedKeys]));
}

function toNumberOrBlank(value) {
  if (value === '' || value === null || value === undefined) return '';
  const parsed = Number(value);
  return Number.isNaN(parsed) ? value : parsed;
}

function isNumericValue(value) {
  if (value === '' || value === null || value === undefined) return false;
  return !Number.isNaN(Number(value));
}

function toNumberOrZero(value) {
  return isNumericValue(value) ? Number(value) : 0;
}

function normalizeEnumName(value) {
  if (value === '' || value === null || value === undefined) return '';
  if (isNumericValue(value)) {
    return String(value);
  }

  return String(value).trim().replace(/\s+/g, '_').toUpperCase();
}

function normalizeEnumValue(value, options, fallback) {
  if (value === '' || value === null || value === undefined) return fallback;
  if (isNumericValue(value)) {
    return options[Number(value)] || fallback;
  }

  const normalized = normalizeEnumName(value);
  return options.includes(normalized) ? normalized : fallback;
}

function normalizeCategoryName(value) {
  if (value === '' || value === null || value === undefined) return '';
  return String(value).trim().replace(/\s+/g, '_');
}

function getLegacyItemID(item) {
  const value = item?.raw?.ID ?? item?.raw?.id ?? item?.legacyId ?? item?.ID;
  return isNumericValue(value) ? Number(value) : 0;
}

function getCategoryMovePath(enemy, category) {
  const nextCategory = String(category || '').trim();
  if (!nextCategory || /[.#$\[\]/]/.test(nextCategory)) return null;

  const match = enemy.writePath.match(/^EnemySettings\/Categories\/([^/]+)\/([^/]+)(\/enemyStats)?$/);
  if (!match) return null;

  const [, currentCategory, enemyKey, suffix = ''] = match;
  if (currentCategory === nextCategory) return null;
  return `EnemySettings/Categories/${nextCategory}/${enemyKey}${suffix}`;
}

export default function EnemyAdminEditor({
  enemy,
  enemies = [],
  items,
  openSection,
  onClose,
  onSaved,
  validate,
}) {
  const fileInputRef = useRef(null);
  const [draft, setDraft] = useState(() => clone(enemy.raw));
  const [drops, setDrops] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const itemOptions = useMemo(
    () => items.map((item) => ({
      key: String(item.itemName || item.itemId || item.firebaseKey),
      label: item.itemName,
      item,
      aliases: getItemAliases(item),
    })),
    [items],
  );

  const enemyOptions = useMemo(() => {
    const unique = (values) => Array.from(new Set(values.filter(Boolean).map(String))).sort();
    return {
      creatureTypes: unique(enemies.flatMap((entry) => [
        ...ENEMY_FAMILIES,
        entry.enemyFamily,
        entry.raw?.enemyFamily,
        entry.raw?.creatureType,
        entry.raw?.type,
      ])),
      categories: unique(enemies.flatMap((entry) => [
        entry.category,
        entry.raw?.category,
      ])),
      attackElements: unique(enemies.flatMap((entry) => [
        ...COMBAT_ELEMENTS,
        entry.attackElement,
        entry.raw?.attackElement,
      ])),
      rarities: unique(enemies.flatMap((entry) => [
        entry.rarity,
        entry.raw?.rarity,
      ])),
    };
  }, [enemies]);

  useEffect(() => {
    const nextDraft = clone(enemy.raw);
    nextDraft.enemyFamily = normalizeEnumValue(nextDraft.enemyFamily, ENEMY_FAMILIES, 'DEFAULT');
    nextDraft.attackElement = normalizeEnumValue(nextDraft.attackElement, COMBAT_ELEMENTS, 'PHYSICAL');
    setDraft(nextDraft);
    setDrops(normalizeDrops(enemy.raw, itemOptions));
    setError('');
    setMessage('');
  }, [enemy, itemOptions]);

  function setField(key, value) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function setNumberField(keys, value, fallback) {
    const key = pickExistingKey(draft, keys, fallback);
    setField(key, toNumberOrBlank(value));
  }

  function setDrop(index, patch) {
    setDrops((current) => current.map((drop, dropIndex) => (
      dropIndex === index ? { ...drop, ...patch } : drop
    )));
  }

  function setCategory(value) {
    setField('category', normalizeCategoryName(value));
  }

  function handleItemSelect(index, selectedKey) {
    const selected = itemOptions.find((option) => option.key === selectedKey);
    if (!selected) {
      setDrop(index, { itemKey: '', itemId: '', itemID: '', itemName: '' });
      return;
    }

    setDrop(index, {
      itemKey: selected.key,
      itemId: selected.item.itemId || selected.item.firebaseKey || '',
      itemID: getLegacyItemID(selected.item),
      itemName: selected.item.itemName,
    });
  }

  function addDrop() {
    const firstItem = itemOptions[0];
    const defaultSourceKey = getDropKey(draft);
    setDrops((current) => [
      ...current,
      {
        sourceKey: defaultSourceKey,
        itemKey: firstItem?.key || '',
        itemId: firstItem?.item.itemId || firstItem?.item.firebaseKey || '',
        itemID: getLegacyItemID(firstItem?.item),
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

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const category = normalizeCategoryName(draft.category || enemy.category || 'uncategorized');
      const enemyName = draft.enemyName || draft.name || enemy.name || enemy.id;
      const upload = await uploadEditorImage(
        file,
        `game-assets/enemies/${sanitizeStorageSegment(category, 'category')}/${sanitizeStorageSegment(enemyName, 'enemy')}/portrait`,
      );
      setDraft((current) => ({
        ...current,
        encyclopediaPortraitUrl: upload.imageUrl,
        encyclopediaPortraitStoragePath: upload.imageStoragePath,
        encyclopediaPortraitMimeType: upload.imageMimeType,
        encyclopediaPortraitWidth: upload.imageWidth,
        encyclopediaPortraitHeight: upload.imageHeight,
        encyclopediaPortraitVersion: upload.imageVersion,
        encyclopediaPortraitBase64: null,
      }));
      setMessage('Image uploaded. Save the enemy to keep this image URL in Firebase.');
    } catch {
      setError('Image upload failed. Check Firebase Storage rules for this admin account.');
    } finally {
      setSaving(false);
      event.target.value = '';
    }
  }

  function getPortraitUrl() {
    if (draft.encyclopediaPortraitUrl) return draft.encyclopediaPortraitUrl;
    if (draft.encyclopediaPortraitBase64) {
      return `data:${draft.encyclopediaPortraitMimeType || 'image/png'};base64,${draft.encyclopediaPortraitBase64}`;
    }
    return enemy.imageUrl;
  }

  async function handleReduceImageSize() {
    const storagePath = draft.encyclopediaPortraitStoragePath;
    if (!storagePath) {
      setError('This portrait is not in Firebase Storage yet. Upload an image first.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const optimized = await reduceStoredImage(storagePath, getPortraitUrl(), {
        maxDimension: 768,
        mimeType: draft.encyclopediaPortraitMimeType || 'image/png',
        currentWidth: draft.encyclopediaPortraitWidth,
        currentHeight: draft.encyclopediaPortraitHeight,
      });
      setDraft((current) => ({
        ...current,
        encyclopediaPortraitUrl: optimized.imageUrl || current.encyclopediaPortraitUrl,
        encyclopediaPortraitStoragePath: optimized.imageStoragePath || current.encyclopediaPortraitStoragePath,
        encyclopediaPortraitMimeType: optimized.imageMimeType || current.encyclopediaPortraitMimeType,
        encyclopediaPortraitWidth: optimized.imageWidth || current.encyclopediaPortraitWidth,
        encyclopediaPortraitHeight: optimized.imageHeight || current.encyclopediaPortraitHeight,
        encyclopediaPortraitVersion: optimized.imageVersion || current.encyclopediaPortraitVersion,
      }));
      const before = formatBytes(optimized.originalBytes);
      const after = formatBytes(optimized.optimizedBytes);
      setMessage(optimized.reduced
        ? `Portrait reduced from ${before} to ${after}. Save the enemy to keep the new metadata.`
        : `Portrait reprocessed (${before} -> ${after}). It may already be small.`);
    } catch (exception) {
      setError(exception.message || 'Image optimization failed.');
    } finally {
      setSaving(false);
    }
  }

  function buildSaveData() {
    const next = clone(draft);
    next.category = normalizeCategoryName(next.category || enemy.category);
    next.enemyFamily = normalizeEnumValue(next.enemyFamily, ENEMY_FAMILIES, 'DEFAULT');
    next.attackElement = normalizeEnumValue(next.attackElement, COMBAT_ELEMENTS, 'PHYSICAL');

    if (openSection !== 'loot') {
      return next;
    }

    getUsedDropKeys(next, drops).forEach((key) => {
      next[key] = [];
    });

    drops.forEach((drop) => {
      const key = drop.sourceKey || getDropKey(next);
      next[key] = [...(Array.isArray(next[key]) ? next[key] : []), buildDropSaveData(drop)];
    });
    return next;
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const next = buildSaveData();
      const validationError = openSection === 'loot' ? validate?.(next) : '';
      if (validationError) {
        setError(validationError);
        return;
      }

      const category = normalizeCategoryName(next.category || enemy.category);
      const movePath = openSection === 'identity' ? getCategoryMovePath(enemy, category) : null;
      if (openSection === 'identity' && category && /[.#$\[\]/]/.test(category)) {
        setError('Category cannot contain ., #, $, [, ], or /.');
        return;
      }

      if (movePath) {
        await saveContentNode(movePath, next);
        await deleteContentNode(enemy.writePath);
      } else {
        await saveContentNode(enemy.writePath, next);
      }
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
        {openSection === 'portrait' && (
          <div className={`${styles.imageEditor} ${styles.full}`}>
            <button
              type="button"
              className={styles.imageButton}
              onClick={() => fileInputRef.current?.click()}
            >
              <img
                src={getPortraitUrl()}
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
            <button
              type="button"
              className={styles.optimizeButton}
              onClick={handleReduceImageSize}
              disabled={saving || !draft.encyclopediaPortraitStoragePath}
              title="Reduce the current Storage portrait while preserving transparency"
            >
              Reduce image size
            </button>
          </div>
        )}

        {openSection === 'identity' && (
          <>
            <div className={styles.imageEditor}>
              <button
                type="button"
                className={styles.imageButton}
                onClick={() => fileInputRef.current?.click()}
              >
                <img
                  src={getPortraitUrl()}
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
              <button
                type="button"
                className={styles.optimizeButton}
                onClick={handleReduceImageSize}
                disabled={saving || !draft.encyclopediaPortraitStoragePath}
                title="Reduce the current Storage portrait while preserving transparency"
              >
                Reduce image size
              </button>
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
              <select
                value={normalizeEnumValue(draft.enemyFamily, ENEMY_FAMILIES, 'DEFAULT')}
                onChange={(event) => setField('enemyFamily', event.target.value)}
              >
                {ENEMY_FAMILIES.map((value) => (
                  <option key={value} value={value}>{value.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span>Category</span>
              <div className={styles.comboField}>
                <select
                  value={enemyOptions.categories.includes(normalizeCategoryName(draft.category || enemy.category)) ? normalizeCategoryName(draft.category || enemy.category) : ''}
                  onChange={(event) => setCategory(event.target.value)}
                >
                  <option value="">New category...</option>
                  {enemyOptions.categories.map((value) => (
                    <option key={value} value={value}>{value.replace(/_/g, ' ')}</option>
                  ))}
                </select>
                <input
                  value={normalizeCategoryName(draft.category || enemy.category)}
                  onChange={(event) => setCategory(event.target.value)}
                  placeholder="New category"
                />
              </div>
            </label>
            <label className={styles.field}>
              <span>Attack element</span>
              <select
                value={normalizeEnumValue(draft.attackElement, COMBAT_ELEMENTS, 'PHYSICAL')}
                onChange={(event) => setField('attackElement', event.target.value)}
              >
                {COMBAT_ELEMENTS.map((value) => (
                  <option key={value} value={value}>{value.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span>Rarity</span>
              <input
                list="enemy-rarities"
                value={draft.rarity ?? ''}
                onChange={(event) => setField('rarity', event.target.value)}
              />
              <datalist id="enemy-rarities">
                {enemyOptions.rarities.map((value) => (
                  <option key={value} value={value} />
                ))}
                {['COMMON', 'NORMAL', 'UNCOMMON', 'RARE', 'UNIQUE', 'LEGENDARY'].map((value) => (
                  <option key={value} value={value} />
                ))}
              </datalist>
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

        {(openSection === 'stats' || openSection === 'behavior') && (
          <div className={styles.full}>
            {openSection === 'stats' && (
              <div className={styles.editorGroup}>
                <h4>Combat Stats</h4>
                <div className={styles.grid}>
                  {COMBAT_STAT_FIELDS.map(([fallback, label, keys]) => (
                    <label key={fallback} className={styles.field}>
                      <span>{label}</span>
                      <input
                        type="number"
                        step="any"
                        value={getNumber(draft, keys)}
                        onChange={(event) => setNumberField(keys, event.target.value, fallback)}
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}

            {openSection === 'behavior' && (
              <>
                <div className={styles.editorGroup}>
                  <h4>Respawn</h4>
                  <div className={styles.grid}>
                    <label className={styles.checkbox}>
                      <input
                        type="checkbox"
                        checked={Boolean(draft.shouldRespawn)}
                        onChange={(event) => setField('shouldRespawn', event.target.checked)}
                      />
                      <span>Should respawn</span>
                    </label>
                    <label className={styles.checkbox}>
                      <input
                        type="checkbox"
                        checked={Boolean(draft.overrideRespawnSettings)}
                        onChange={(event) => setField('overrideRespawnSettings', event.target.checked)}
                      />
                      <span>Override respawn settings</span>
                    </label>
                    {RESPAWN_FIELDS.map(([key, label]) => (
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
                </div>

                <div className={styles.editorGroup}>
                  <h4>Movement / AI</h4>
                  <div className={styles.grid}>
                    <label className={styles.checkbox}>
                      <input
                        type="checkbox"
                        checked={Boolean(draft.overrideMovementBehavior)}
                        onChange={(event) => setField('overrideMovementBehavior', event.target.checked)}
                      />
                      <span>Override movement behavior</span>
                    </label>
                    <label className={styles.checkbox}>
                      <input
                        type="checkbox"
                        checked={Boolean(draft.shouldReactToAttack)}
                        onChange={(event) => setField('shouldReactToAttack', event.target.checked)}
                      />
                      <span>React to attack</span>
                    </label>
                    <label className={styles.field}>
                      <span>Behavior type</span>
                      <select
                        value={draft.behaviorType ?? ''}
                        onChange={(event) => setField('behaviorType', toNumberOrBlank(event.target.value))}
                      >
                        <option value="">Use prefab default</option>
                        {BEHAVIOR_TYPES.map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </label>
                    {MOVEMENT_FIELDS.map(([key, label]) => (
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
                </div>
              </>
            )}
          </div>
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
                    <span>Drop list</span>
                    <select
                      value={drop.sourceKey || getDropKey(draft)}
                      onChange={(event) => setDrop(index, { sourceKey: event.target.value })}
                    >
                      {DROP_KEYS.map((key) => (
                        <option key={key} value={key}>{DROP_LIST_LABELS[key]}</option>
                      ))}
                    </select>
                  </label>
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
