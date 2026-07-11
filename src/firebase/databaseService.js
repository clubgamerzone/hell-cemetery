import { ref, get, set } from 'firebase/database';
import { database } from './firebaseConfig';
import { parseEnemySettings, groupEnemiesByCategory } from '../utils/enemyParser';
import { normalizeItemSettings, normalizeCraftingSettings } from '../utils/itemParser';

export { parseEnemySettings, groupEnemiesByCategory };
export { normalizeItemSettings, normalizeCraftingSettings };

/**
 * SECURITY REMINDER:
 * Firebase Realtime Database rules must protect player data.
 * Users should only read their own profile data:
 *   auth != null && auth.uid == $uid
 *
 * See firebase-rules-example.json for suggested rules.
 */

async function fetchNode(path) {
  const snapshot = await get(ref(database, path));
  if (!snapshot.exists()) return null;
  return snapshot.val();
}

export async function saveContentNode(path, data) {
  if (!path || typeof path !== 'string') {
    throw new Error('A valid Firebase path is required.');
  }
  await set(ref(database, path), data);
}

function sortChunkEntries(chunks) {
  return Object.entries(chunks || {}).sort(([leftKey], [rightKey]) => {
    const leftIndex = Number(String(leftKey).replace('chunk_', ''));
    const rightIndex = Number(String(rightKey).replace('chunk_', ''));
    return leftIndex - rightIndex;
  });
}

function appendArray(target, key, values) {
  if (!Array.isArray(values)) return;
  target[key] = [...(Array.isArray(target[key]) ? target[key] : []), ...values];
}

export function normalizeSaveData(rawData) {
  if (!rawData || typeof rawData !== 'object' || !rawData.metadata || !rawData.chunks) {
    return rawData;
  }

  return sortChunkEntries(rawData.chunks).reduce((saveData, [, chunk]) => {
    if (!chunk || typeof chunk !== 'object') return saveData;

    const { inventoryItemsName, inventoryItemsAmount, goToAddId, chunkInfo, ...chunkData } = chunk;
    Object.assign(saveData, chunkData);
    appendArray(saveData, 'inventoryItemsName', inventoryItemsName);
    appendArray(saveData, 'inventoryItemsAmount', inventoryItemsAmount);
    appendArray(saveData, 'goToAddId', goToAddId);
    return saveData;
  }, {});
}

async function fetchFirstExisting(paths) {
  for (const path of paths) {
    try {
      const data = await fetchNode(path);
      if (data !== null && data !== undefined) {
        return { data, path };
      }
    } catch {
    }
  }
  return { data: null, path: null };
}

export async function getPlayerProfile(uid) {
  try {
    const { data, path } = await fetchFirstExisting([
      `Players/${uid}`,
      `players/${uid}`,
    ]);
    return { data, path };
  } catch {
    throw new Error('Unable to load player profile.');
  }
}

/**
 * Load player character / save data from Firebase.
 *
 * SECURITY REMINDER:
 * RTDB rules must restrict each path to the authenticated owner's uid:
 *   auth != null && auth.uid == $uid
 * GameData/{uid} contains private save data — do NOT leave all of GameData publicly readable.
 */
export async function getPlayerCharacter(uid) {
  const candidatePaths = [
    `GameData/${uid}`,
    `Players/${uid}`,
    `players/${uid}`,
    `GameData/Players/${uid}`,
    `PlayerCharacter/${uid}`,
    `PlayerCharacters/${uid}`,
  ];

  try {
    const { data, path } = await fetchFirstExisting(candidatePaths);
    return { data: normalizeSaveData(data), rawData: data, path, checkedPaths: candidatePaths };
  } catch {
    throw new Error('Unable to load player character.');
  }
}

export async function getPlayerCastle(uid) {
  try {
    const data = await fetchNode(`PlayerCastles/${uid}`);
    return { data, path: data ? `PlayerCastles/${uid}` : null };
  } catch {
    throw new Error('Unable to load player castle.');
  }
}

export async function getPlayerRaidHistory(uid) {
  try {
    const data = await fetchNode(`PlayerCastleRaidHistory/${uid}`);
    return { data, path: data ? `PlayerCastleRaidHistory/${uid}` : null };
  } catch {
    throw new Error('Unable to load raid history.');
  }
}

export async function getPlayerMarket(uid) {
  try {
    const legacyMarket = await fetchNode(`PlayerMarket/${uid}`);
    if (legacyMarket) {
      return { data: legacyMarket, path: `PlayerMarket/${uid}` };
    }

    const [listings, payouts, returnedListings, saleHistory] = await Promise.all([
      fetchNode('PlayerMarket/Listings'),
      fetchNode(`PlayerMarket/Payouts/${uid}`),
      fetchNode(`PlayerMarket/ReturnedListings/${uid}`),
      fetchNode('PlayerMarket/SaleHistory'),
    ]);

    const currentUserListings = normalizeToArray(listings).filter(
      (listing) => listing.sellerUid === uid || listing.buyerUid === uid
    );
    const currentUserSaleHistory = normalizeToArray(saleHistory).filter(
      (entry) => entry.sellerUid === uid || entry.buyerUid === uid
    );
    const data = {
      listings: currentUserListings,
      payouts,
      returnedListings,
      saleHistory: currentUserSaleHistory,
    };
    const hasMarketData = currentUserListings.length > 0 ||
      currentUserSaleHistory.length > 0 ||
      hasMeaningfulData(payouts) ||
      hasMeaningfulData(returnedListings);

    return {
      data: hasMarketData ? data : null,
      path: 'PlayerMarket',
    };
  } catch {
    throw new Error('Unable to load player market.');
  }
}

export async function getEnemySettings() {
  try {
    const data = await fetchNode('EnemySettings');
    return data;
  } catch {
    throw new Error('Unable to load enemy settings.');
  }
}

export function normalizeEnemies(data) {
  return parseEnemySettings(data);
}

export async function getItems() {
  try {
    const { data } = await fetchFirstExisting([
      'ItemSettings',
      'GameData/Items',
      'Items',
      'GameData/items',
      'gameData/items',
    ]);
    return data;
  } catch {
    throw new Error('Unable to load items.');
  }
}

export async function getCraftingSettings() {
  try {
    const { data } = await fetchFirstExisting([
      'CraftingSettings',
      'GameData/CraftingSettings',
      'CraftingRecipes',
      'Recipes',
    ]);
    return data;
  } catch {
    throw new Error('Unable to load crafting settings.');
  }
}

export async function getGameData() {
  try {
    const data = await fetchNode('GameData');
    return data;
  } catch {
    throw new Error('Unable to load game data.');
  }
}

export function normalizeToArray(data) {
  if (!data) return [];
  if (Array.isArray(data)) {
    return data.map((item, index) => ({
      id: String(index),
      ...item,
    }));
  }
  if (typeof data === 'object') {
    return Object.entries(data).map(([key, value]) => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return { id: key, ...value };
      }
      return { id: key, value };
    });
  }
  return [];
}

export function hasMeaningfulData(data) {
  if (data === null || data === undefined) return false;
  if (typeof data === 'object' && !Array.isArray(data)) {
    return Object.keys(data).length > 0;
  }
  if (Array.isArray(data)) return data.length > 0;
  return true;
}
