const DEFAULT_LORE =
  'A fearsome creature lurking in the shadows of Hell Cemetery, waiting to claim unwary souls.';

const CATEGORY_LABELS = {
  Default: 'Normal Creature',
  Flying: 'Flying Creature',
  Undead: 'Undead',
  Elemental: 'Elemental',
  Demon_Infernal: 'Infernal Demon',
};

const STAT_FIELD_MAP = {
  health: ['healthPoints', 'health', 'hp', 'HP', 'maxHealth', 'maxHP'],
  defense: ['defense', 'Defense', 'defence'],
  speed: ['speed', 'Speed', 'moveSpeed'],
  damage: ['damageToGive', 'damage', 'Damage', 'attackDamage'],
  experience: ['experienceToGive', 'experience', 'Experience', 'xp', 'XP'],
};

const NAME_KEYS = ['enemyName', 'name', 'Name', 'displayName', 'DisplayName'];
const IMAGE_KEYS = ['image', 'Image', 'imageUrl', 'ImageUrl', 'icon', 'Icon', 'sprite', 'Sprite'];
const RESISTANCE_KEYS = ['resistances', 'Resistances', 'elementResistances', 'damageResistances'];
const ELEMENT_DAMAGE_TAKEN_FIELDS = [
  ['fireDamageTakenPercent', 'Fire'],
  ['iceDamageTakenPercent', 'Ice'],
  ['lightningDamageTakenPercent', 'Lightning'],
  ['poisonDamageTakenPercent', 'Poison'],
  ['holyDamageTakenPercent', 'Holy'],
  ['darkDamageTakenPercent', 'Dark'],
  ['arcaneDamageTakenPercent', 'Arcane'],
];

function pickField(obj, keys) {
  if (!obj || typeof obj !== 'object') return null;
  for (const key of keys) {
    const value = obj[key];
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }
  return null;
}

function formatCategoryLabel(categoryKey) {
  if (!categoryKey) return 'Unknown';
  if (CATEGORY_LABELS[categoryKey]) return CATEGORY_LABELS[categoryKey];
  return categoryKey
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function looksLikeEnemyStats(obj) {
  if (!isPlainObject(obj)) return false;
  return (
    pickField(obj, NAME_KEYS) !== null ||
    pickField(obj, STAT_FIELD_MAP.health) !== null ||
    pickField(obj, STAT_FIELD_MAP.damage) !== null ||
    Array.isArray(obj.lootDrops) ||
    Array.isArray(obj.drops)
  );
}

function unwrapEnemyRecord(record) {
  if (!isPlainObject(record)) return null;

  if (isPlainObject(record.enemyStats)) {
    return { stats: record.enemyStats, usesWrapper: true };
  }

  if (looksLikeEnemyStats(record)) {
    return { stats: record, usesWrapper: false };
  }

  return null;
}

function extractStat(stats, statName) {
  const value = pickField(stats, STAT_FIELD_MAP[statName]);
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function normalizeLootDrops(stats) {
  const tieredDrops = [
    ...(Array.isArray(stats.commonDrops) ? stats.commonDrops : []),
    ...(Array.isArray(stats.normalDrops) ? stats.normalDrops : []),
    ...(Array.isArray(stats.uncommonDrops) ? stats.uncommonDrops : []),
    ...(Array.isArray(stats.rareDrops) ? stats.rareDrops : []),
    ...(Array.isArray(stats.veryRareDrops) ? stats.veryRareDrops : []),
    ...(Array.isArray(stats.legendaryDrops) ? stats.legendaryDrops : []),
  ];
  const legacyDrops = stats.lootDrops || stats.drops || stats.Drops || stats.rewards || [];
  const drops = tieredDrops.length > 0 ? tieredDrops : legacyDrops;
  if (!Array.isArray(drops)) return [];

  return drops.map((drop, index) => {
    if (!isPlainObject(drop)) {
      return {
        id: String(index),
        itemName: String(drop),
        dropChance: null,
        isGuaranteed: false,
        minAmount: null,
        maxAmount: null,
        itemId: null,
        itemID: null,
      };
    }

    return {
      id: String(drop.itemId ?? drop.itemID ?? drop.id ?? index),
      itemName: drop.itemName || drop.name || drop.Name || `Item ${index + 1}`,
      dropTier: drop.dropTier || drop.tier || null,
      dropChance: drop.dropChance ?? drop.chance ?? null,
      isGuaranteed: Boolean(drop.isGuaranteed),
      minAmount: drop.minAmount ?? null,
      maxAmount: drop.maxAmount ?? null,
      itemId: drop.itemId ?? null,
      itemID: drop.itemID ?? drop.id ?? null,
    };
  });
}

function normalizeResistances(stats) {
  const elementRows = ELEMENT_DAMAGE_TAKEN_FIELDS
    .filter(([field]) => stats[field] !== undefined && stats[field] !== null && stats[field] !== '')
    .map(([field, name]) => ({
      name,
      value: `${Math.round(Number(stats[field]))}% damage`,
    }));

  if (elementRows.length > 0) return elementRows;

  const raw = pickField(stats, RESISTANCE_KEYS);
  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw.map((entry) => {
      if (typeof entry === 'string') return { name: entry, value: 'Normal' };
      if (isPlainObject(entry)) {
        return {
          name: entry.name || entry.type || entry.element || 'Unknown',
          value: entry.value ?? entry.level ?? entry.resistance ?? 'Normal',
        };
      }
      return { name: String(entry), value: 'Normal' };
    });
  }

  if (isPlainObject(raw)) {
    return Object.entries(raw).map(([name, value]) => ({
      name,
      value: value === null || value === undefined ? 'Normal' : String(value),
    }));
  }

  return [];
}

function dataUriFromBase64(base64, mimeType) {
  if (!base64) return null;
  if (String(base64).startsWith('data:')) return base64;
  return `data:${mimeType || 'image/png'};base64,${base64}`;
}

function buildEnemy({ category, enemyKey, stats, path, writePath }) {
  const name =
    pickField(stats, NAME_KEYS) ||
    enemyKey.replace(/_/g, ' ');

  const categoryLabel = formatCategoryLabel(category);
  const id = `${category}_${enemyKey}`.replace(/\s+/g, '_');

  return {
    id,
    category,
    categoryLabel,
    name,
    description: (pickField(stats, ['description', 'Description', 'lore', 'Lore']) || DEFAULT_LORE).trim(),
    imageUrl: dataUriFromBase64(stats.encyclopediaPortraitBase64, stats.encyclopediaPortraitMimeType) ||
      pickField(stats, IMAGE_KEYS),
    frameUrl: dataUriFromBase64(stats.encyclopediaCardFrameBase64, stats.encyclopediaCardFrameMimeType),
    isBoss: Boolean(stats.isBoss ?? stats.IsBoss),
    rarity: stats.rarity ?? null,
    enemyFamily: stats.enemyFamily || null,
    attackElement: stats.attackElement || null,
    stats: {
      health: extractStat(stats, 'health'),
      defense: extractStat(stats, 'defense'),
      speed: extractStat(stats, 'speed'),
      damage: extractStat(stats, 'damage'),
      experience: extractStat(stats, 'experience'),
    },
    lootDrops: normalizeLootDrops(stats),
    resistances: normalizeResistances(stats),
    behavior: {
      behaviorType: stats.behaviorType ?? null,
      detectionRadius: stats.detectionRadius ?? null,
      pursuitMultiplier: stats.pursuitMultiplier ?? null,
      shouldRespawn: stats.shouldRespawn ?? null,
    },
    sourcePath: path,
    writePath,
    raw: stats,
  };
}

function collectFromCategory(category, categoryData, results) {
  if (!isPlainObject(categoryData)) return;

  Object.entries(categoryData).forEach(([enemyKey, enemyRecord]) => {
    const unwrapped = unwrapEnemyRecord(enemyRecord);
    if (!unwrapped) return;

    const path = `EnemySettings/Categories/${category}/${enemyKey}`;

    results.push(
      buildEnemy({
        category,
        enemyKey,
        stats: unwrapped.stats,
        path,
        writePath: unwrapped.usesWrapper ? `${path}/enemyStats` : path,
      }),
    );
  });
}

function collectFromFlatObject(data, results) {
  Object.entries(data).forEach(([key, value]) => {
    if (key === 'Categories' || key === 'categories') return;

    const unwrapped = unwrapEnemyRecord(value);
    if (unwrapped) {
      const path = `EnemySettings/${key}`;
      results.push(
        buildEnemy({
          category: 'Default',
          enemyKey: key,
          stats: unwrapped.stats,
          path,
          writePath: unwrapped.usesWrapper ? `${path}/enemyStats` : path,
        }),
      );
    }
  });
}

/**
 * Flatten EnemySettings from Firebase into a sorted array of normalized enemies.
 * Supports:
 * - EnemySettings/Categories/{category}/{enemyKey}/enemyStats
 * - Flat enemy objects at any depth with enemyStats wrapper
 * - Direct stat objects with enemyName / healthPoints fields
 */
export function parseEnemySettings(data) {
  if (!data) return [];

  const results = [];

  if (isPlainObject(data.Categories)) {
    Object.entries(data.Categories).forEach(([category, categoryData]) => {
      collectFromCategory(category, categoryData, results);
    });
  } else if (isPlainObject(data.categories)) {
    Object.entries(data.categories).forEach(([category, categoryData]) => {
      collectFromCategory(category, categoryData, results);
    });
  } else if (Array.isArray(data)) {
    data.forEach((entry, index) => {
      const unwrapped = unwrapEnemyRecord(entry);
      if (!unwrapped) return;
      results.push(
        buildEnemy({
          category: entry.category || 'Default',
          enemyKey: pickField(unwrapped.stats, NAME_KEYS) || String(index),
          stats: unwrapped.stats,
          path: `EnemySettings[${index}]`,
          writePath: `EnemySettings/${index}`,
        }),
      );
    });
  } else if (isPlainObject(data)) {
    collectFromFlatObject(data, results);

    Object.entries(data).forEach(([key, value]) => {
      if (!isPlainObject(value)) return;
      if (key === 'Categories' || key === 'categories') {
        Object.entries(value).forEach(([category, categoryData]) => {
          collectFromCategory(category, categoryData, results);
        });
      }
    });
  }

  const unique = new Map();
  results.forEach((enemy) => {
    unique.set(enemy.id, enemy);
  });

  return Array.from(unique.values()).sort((a, b) => {
    const categoryCompare = a.category.localeCompare(b.category);
    if (categoryCompare !== 0) return categoryCompare;
    return a.name.localeCompare(b.name);
  });
}

export function groupEnemiesByCategory(enemies) {
  const groups = new Map();

  enemies.forEach((enemy) => {
    if (!groups.has(enemy.category)) {
      groups.set(enemy.category, {
        category: enemy.category,
        label: enemy.categoryLabel,
        enemies: [],
      });
    }
    groups.get(enemy.category).enemies.push(enemy);
  });

  return Array.from(groups.values());
}

export function formatStatValue(value) {
  if (value === null || value === undefined) return '—';
  return String(value);
}

export function formatDropChance(chance) {
  if (chance === null || chance === undefined) return null;
  const num = Number(chance);
  if (Number.isNaN(num)) return String(chance);
  if (num <= 1) return `${Math.round(num * 100)}%`;
  return `${num}%`;
}

export function getEnemyListSlug(enemy) {
  return slugify(enemy.id || enemy.name);
}
