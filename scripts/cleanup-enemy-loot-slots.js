import fs from 'fs';
import path from 'path';

const databaseUrl = process.env.FIREBASE_DATABASE_URL || 'https://hell-cemetery-metroidvania-990-default-rtdb.firebaseio.com';
const token = process.env.FIREBASE_TOKEN;
const dryRun = process.argv.includes('--dry-run');

if (!token) {
  console.error('FIREBASE_TOKEN is required. Use: $env:FIREBASE_TOKEN = gcloud auth print-access-token');
  process.exit(1);
}

const activeDropKeys = ['commonDrops', 'normalDrops', 'legendaryDrops'];
const obsoleteDropKeys = ['lootDrops', 'drops', 'Drops', 'rewards', 'uncommonDrops', 'rareDrops', 'veryRareDrops'];

function urlFor(route) {
  return `${databaseUrl}/${route}?access_token=${encodeURIComponent(token)}`;
}

async function readJson(route) {
  const response = await fetch(urlFor(route));
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`GET ${route} failed: HTTP ${response.status} ${text}`);
  }
  return text ? JSON.parse(text) : null;
}

async function patchJson(route, value) {
  const response = await fetch(urlFor(route), {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(value),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`PATCH ${route} failed: HTTP ${response.status} ${text}`);
  }
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function collectEnemyStats(root) {
  const result = [];
  const categories = root?.Categories;
  if (!isObject(categories)) return result;

  Object.entries(categories).forEach(([categoryKey, category]) => {
    if (!isObject(category)) return;
    Object.entries(category).forEach(([enemyKey, record]) => {
      const stats = isObject(record?.enemyStats) ? record.enemyStats : record;
      if (!isObject(stats)) return;
      result.push({
        categoryKey,
        enemyKey,
        stats,
        path: `EnemySettings/Categories/${categoryKey}/${enemyKey}${isObject(record?.enemyStats) ? '/enemyStats' : ''}`,
      });
    });
  });

  return result;
}

function summarizeDrop(drop) {
  if (!drop || typeof drop !== 'object') return String(drop);
  return drop.itemName || drop.itemId || drop.itemID || drop.name || JSON.stringify(drop);
}

async function main() {
  const enemySettings = await readJson('EnemySettings.json');
  const now = new Date().toISOString();
  const backupDir = path.join('firebase-backups', 'enemy-loot-cleanup');
  fs.mkdirSync(backupDir, { recursive: true });

  const backupPath = path.join(backupDir, `EnemySettings-before-loot-cleanup-${now.replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(enemySettings, null, 2), 'utf8');

  const updates = {};
  const report = [];

  collectEnemyStats(enemySettings).forEach(({ categoryKey, enemyKey, stats, path: enemyPath }) => {
    const before = {};
    const after = {};
    let changed = false;

    activeDropKeys.forEach((key) => {
      if (!Array.isArray(stats[key])) return;
      before[key] = stats[key].map(summarizeDrop);
      const trimmed = stats[key].slice(0, 1);
      after[key] = trimmed.map(summarizeDrop);
      if (trimmed.length !== stats[key].length) {
        updates[`${enemyPath}/${key}`] = trimmed;
        changed = true;
      }
    });

    obsoleteDropKeys.forEach((key) => {
      if (!Array.isArray(stats[key])) return;
      before[key] = stats[key].map(summarizeDrop);
      updates[`${enemyPath}/${key}`] = null;
      changed = true;
    });

    if (changed) {
      report.push({ categoryKey, enemyKey, path: enemyPath, before, after });
    }
  });

  const reportPath = path.join(backupDir, `enemy-loot-cleanup-${now.replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(reportPath, JSON.stringify({ dryRun, changedEnemies: report.length, updates: Object.keys(updates).length, report }, null, 2), 'utf8');

  if (!dryRun && Object.keys(updates).length > 0) {
    await patchJson('.json', updates);
  }

  console.log(JSON.stringify({
    dryRun,
    changedEnemies: report.length,
    updates: Object.keys(updates).length,
    backupPath,
    reportPath,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
