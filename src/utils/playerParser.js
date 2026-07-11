/**
 * Flexible player character parser for Firebase save data.
 * Handles nested Unity save structures (GameData/{uid}) and flat player nodes.
 */

const NAME_KEYS = [
  'Username', 'username', 'name', 'Name', 'displayName', 'DisplayName',
  'playerName', 'PlayerName', 'characterName', 'CharacterName',
];
const CLASS_KEYS = [
  'class', 'Class', 'characterClass', 'CharacterClass', 'playerClass',
  'PlayerClass', 'archetype', 'Archetype',
];
const LEVEL_KEYS = [
  'currentLvl', 'CurrentLvl', 'level', 'Level', 'playerLevel', 'PlayerLevel',
];
const IMAGE_KEYS = [
  'image', 'Image', 'imageUrl', 'ImageUrl', 'portrait', 'Portrait',
  'avatar', 'Avatar', 'sprite', 'Sprite', 'icon', 'Icon',
];
const STATS_CONTAINER_KEYS = [
  'playerStats', 'PlayerStats', 'stats', 'Stats', 'attributes', 'Attributes',
];
const PLAYER_DATA_KEYS = ['PlayerData', 'playerData', 'player', 'Player'];
const INVENTORY_KEYS = [
  'inventorySlots', 'InventorySlots', 'inventory', 'Inventory', 'items', 'Items',
];
const INVENTORY_ITEM_NAME_KEYS = ['inventoryItemsName', 'InventoryItemsName'];
const INVENTORY_ITEM_AMOUNT_KEYS = ['inventoryItemsAmount', 'InventoryItemsAmount'];
const VAULT_KEYS = ['vaultSlots', 'VaultSlots', 'vault', 'Vault'];
const POWER_KEYS = ['PlayerPower', 'playerPower', 'power', 'Power'];
const CLAN_KEYS = ['ClanInfo', 'clanInfo', 'clan', 'Clan'];

const STAT_DISPLAY_ORDER = [
  'currentLvl', 'Level', 'level',
  'maxHealth', 'MaxHealth', 'health', 'Health', 'currentHealth', 'CurrentHealth',
  'heartsAmount', 'HeartsAmount', 'maxHearts', 'MaxHearts',
  'attack', 'Attack', 'defense', 'Defense',
  'CurrentStamina', 'currentStamina', 'MaxStamina', 'maxStamina',
  'currentExperience', 'CurrentExperience', 'expTNL', 'ExpTNL',
  'bank', 'Bank',
];

const RESERVED_TOP_KEYS = new Set([
  ...PLAYER_DATA_KEYS,
  ...STATS_CONTAINER_KEYS,
  ...INVENTORY_KEYS,
  ...INVENTORY_ITEM_NAME_KEYS,
  ...INVENTORY_ITEM_AMOUNT_KEYS,
  ...VAULT_KEYS,
  ...POWER_KEYS,
  ...CLAN_KEYS,
  'playerPosition', 'lastSavedScene', 'currentSubweaponIndex',
  'experienceForkillQuest', 'experienceForCollectQuest',
  'numberOfCollectQuestCompleted', 'numberOfKillQuestCompleted',
  'questCollectActive', 'hasMapItem', 'talkedToHannah', 'showAds', 'updatedApp',
  'Email', 'email', 'ID', 'id', 'LastLogin', 'lastLogin',
]);

function pickField(source, keys) {
  if (!source || typeof source !== 'object') return null;
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }
  return null;
}

function pickNestedObject(source, keys) {
  for (const key of keys) {
    const value = source?.[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value;
    }
  }
  return null;
}

function formatValue(value) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function countSlots(data) {
  if (data === null || data === undefined) return 0;
  if (typeof data === 'number') return data;
  if (Array.isArray(data)) return data.length;
  if (typeof data === 'object') return Object.keys(data).length;
  return 0;
}

function summarizeInventory(data) {
  const count = countSlots(data);
  if (count === 0) return 'Empty';

  if (typeof data === 'number') {
    return `${data} slot${data === 1 ? '' : 's'}`;
  }

  if (Array.isArray(data)) {
    const named = data
      .filter(Boolean)
      .map((item) => {
        if (typeof item === 'object') {
          return pickField(item, NAME_KEYS) || pickField(item, ['itemId', 'ItemId', 'id', 'Id']) || 'Item';
        }
        return String(item);
      })
      .slice(0, 6);
    const suffix = data.length > 6 ? ` (+${data.length - 6} more)` : '';
    return named.length > 0 ? `${named.join(', ')}${suffix}` : `${data.length} items`;
  }

  if (typeof data === 'object') {
    const entries = Object.entries(data).filter(([, value]) => value !== null && value !== undefined);
    const named = entries
      .slice(0, 6)
      .map(([, value]) => {
        if (typeof value === 'object') {
          return pickField(value, NAME_KEYS) || pickField(value, ['itemId', 'ItemId']) || 'Item';
        }
        return String(value);
      });
    const suffix = entries.length > 6 ? ` (+${entries.length - 6} more)` : '';
    return named.length > 0 ? `${named.join(', ')}${suffix}` : `${entries.length} items`;
  }

  return formatValue(data);
}

function buildInventoryItems(rawData) {
  const names = pickField(rawData, INVENTORY_ITEM_NAME_KEYS);
  const amounts = pickField(rawData, INVENTORY_ITEM_AMOUNT_KEYS);
  if (!Array.isArray(names) || names.length === 0) return null;

  return names
    .map((name, index) => ({
      name,
      amount: Array.isArray(amounts) ? amounts[index] : null,
    }))
    .filter((item) => item.name !== null && item.name !== undefined && item.name !== '');
}

function summarizeInventoryItems(items) {
  if (!Array.isArray(items) || items.length === 0) return 'Empty';

  const named = items.slice(0, 6).map((item) => {
    const amount = Number(item.amount);
    if (Number.isFinite(amount) && amount > 1) {
      return `${item.name} x${amount}`;
    }
    return String(item.name);
  });
  const suffix = items.length > 6 ? ` (+${items.length - 6} more)` : '';
  return `${named.join(', ')}${suffix}`;
}

function extractStats(rawData, statsContainer) {
  const stats = {};

  if (statsContainer) {
    Object.entries(statsContainer).forEach(([key, value]) => {
      if (value !== null && value !== undefined && typeof value !== 'object') {
        stats[key] = value;
      }
    });
  }

  STAT_DISPLAY_ORDER.forEach((key) => {
    if (stats[key] === undefined && rawData[key] !== undefined && rawData[key] !== null) {
      stats[key] = rawData[key];
    }
  });

  return stats;
}

function extractExtraFields(rawData, usedKeys) {
  return Object.entries(rawData).filter(
    ([key, value]) =>
      !usedKeys.has(key) &&
      !RESERVED_TOP_KEYS.has(key) &&
      value !== null &&
      value !== undefined &&
      typeof value !== 'object'
  );
}

/**
 * Parse raw Firebase player data into display-friendly character info.
 * @returns {object|null} Normalized character or null if no meaningful data.
 */
export function parsePlayerCharacter(rawData) {
  if (!rawData || typeof rawData !== 'object') return null;

  const playerData = pickNestedObject(rawData, PLAYER_DATA_KEYS);
  const statsContainer = pickNestedObject(rawData, STATS_CONTAINER_KEYS);
  const inventoryItems = buildInventoryItems(rawData);
  const inventory = inventoryItems || pickField(rawData, INVENTORY_KEYS);
  const vault = pickField(rawData, VAULT_KEYS);
  const power = pickField(rawData, POWER_KEYS);
  const clanInfo = pickNestedObject(rawData, CLAN_KEYS);

  const identitySource = playerData || rawData;

  const name = pickField(identitySource, NAME_KEYS);
  const playerClass = pickField(rawData, CLASS_KEYS) || pickField(identitySource, CLASS_KEYS);
  const level = pickField(statsContainer, LEVEL_KEYS) || pickField(rawData, LEVEL_KEYS);
  const imageUrl = pickField(rawData, IMAGE_KEYS) || pickField(identitySource, IMAGE_KEYS);
  const stats = extractStats(rawData, statsContainer);

  const usedKeys = new Set([
    ...Object.keys(playerData || {}),
    ...Object.keys(statsContainer || {}),
    ...(inventory !== null ? [...INVENTORY_KEYS, ...INVENTORY_ITEM_NAME_KEYS, ...INVENTORY_ITEM_AMOUNT_KEYS] : []),
    ...(vault !== null ? ['vaultSlots', 'VaultSlots', 'vault', 'Vault'] : []),
    ...(power !== null ? ['PlayerPower', 'playerPower', 'power', 'Power'] : []),
    ...(clanInfo ? ['ClanInfo', 'clanInfo', 'clan', 'Clan'] : []),
  ]);

  const extraFields = extractExtraFields(rawData, usedKeys);

  const hasIdentity = Boolean(name || playerClass || level);
  const hasStats = Object.keys(stats).length > 0;
  const hasInventory = inventory !== null && inventory !== undefined && countSlots(inventory) > 0;
  const hasVault = vault !== null && vault !== undefined && countSlots(vault) > 0;
  const hasPower = power !== null && power !== undefined;
  const hasClan = clanInfo && Object.values(clanInfo).some((v) => v !== '' && v !== 0 && v !== null);

  if (!hasIdentity && !hasStats && !hasInventory && !hasVault && !hasPower && !hasClan && extraFields.length === 0) {
    return null;
  }

  const statRows = Object.entries(stats).map(([key, value]) => ({
    key,
    label: formatStatLabel(key),
    value: formatValue(value),
  }));

  statRows.sort((a, b) => {
    const ai = STAT_DISPLAY_ORDER.indexOf(a.key);
    const bi = STAT_DISPLAY_ORDER.indexOf(b.key);
    const aRank = ai === -1 ? 999 : ai;
    const bRank = bi === -1 ? 999 : bi;
    return aRank - bRank || a.label.localeCompare(b.label);
  });

  return {
    name: name || 'Unknown Adventurer',
    class: playerClass,
    level,
    imageUrl,
    stats: statRows,
    power,
    inventorySummary: inventoryItems ? summarizeInventoryItems(inventoryItems) : summarizeInventory(inventory),
    inventoryCount: countSlots(inventory),
    vaultSummary: summarizeInventory(vault),
    vaultCount: countSlots(vault),
    clanInfo: hasClan ? clanInfo : null,
    lastLogin: pickField(identitySource, ['LastLogin', 'lastLogin']),
    lastSavedScene: pickField(rawData, ['lastSavedScene', 'LastSavedScene']),
    extraFields,
    rawData,
  };
}

function formatStatLabel(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

export function hasCharacterData(parsed) {
  return parsed !== null && parsed !== undefined;
}
