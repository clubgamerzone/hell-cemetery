import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const unityRoot = process.env.HELL_CEMETERY_UNITY_ROOT || 'D:\\Unity\\Hell Cemetery Metroivania';
const enemyPrefabRoot = path.join(unityRoot, 'Assets', '7. Prefabs', 'Enemies');
const prefabRoot = path.join(unityRoot, 'Assets', '7. Prefabs');
const outputPath = path.join(webRoot, 'src', 'data', 'enemyDamageDefaults.json');

const SCRIPT_GUIDS = {
  enemy: '15c64c2e92999354e8cefd1bed569249',
  playerDamager: 'de4ae5f740fe18846ba235b373dfe789',
  projectileDamage: '13f5cea1987ccc24aa6005fb8b69f388',
  enemyProjectile: '2e398dd0c19c3cd49ba334ff55fff607',
};

function walk(directory, suffix, results = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(fullPath, suffix, results);
    else if (entry.name.endsWith(suffix)) results.push(fullPath);
  }
  return results;
}

function blocks(text) {
  return text.split(/^--- !u!\d+ &[^\r\n]+\r?$/m);
}

function scriptBlocks(text, guid) {
  return blocks(text).filter((block) => block.includes(`guid: ${guid}`));
}

function field(block, name) {
  const match = block.match(new RegExp(`^  ${name}:[ \\t]*(.*)$`, 'm'));
  return match ? match[1].trim() : null;
}

function numberField(block, name, fallback = -1) {
  const parsed = Number(field(block, name));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function prefabGuid(block, name) {
  const match = block.match(new RegExp(`${name}:\\s*\\{[\\s\\S]*?guid:\\s*([0-9a-f]{32})[\\s\\S]*?\\}`));
  return match ? match[1] : null;
}

const prefabPaths = walk(prefabRoot, '.prefab');
const guidToPrefab = new Map();
for (const prefabPath of prefabPaths) {
  const metaPath = `${prefabPath}.meta`;
  if (!fs.existsSync(metaPath)) continue;
  const match = fs.readFileSync(metaPath, 'utf8').match(/^guid:\s*([0-9a-f]{32})\s*$/m);
  if (match) guidToPrefab.set(match[1], prefabPath);
}

function readDamageFromProjectile(projectileGuid) {
  const projectilePath = guidToPrefab.get(projectileGuid);
  if (!projectilePath) return -1;
  const text = fs.readFileSync(projectilePath, 'utf8');
  const enemyBlock = scriptBlocks(text, SCRIPT_GUIDS.enemy)[0];
  if (enemyBlock) return numberField(enemyBlock, 'damageToGive');
  const damagerBlock = scriptBlocks(text, SCRIPT_GUIDS.playerDamager)[0];
  if (damagerBlock) return numberField(damagerBlock, 'damageToGive');
  const projectileBlock = scriptBlocks(text, SCRIPT_GUIDS.projectileDamage)[0];
  return projectileBlock ? numberField(projectileBlock, 'damageToGive') : -1;
}

const defaults = {};
const conflicts = [];
for (const prefabPath of walk(enemyPrefabRoot, '.prefab')) {
  const text = fs.readFileSync(prefabPath, 'utf8');
  const meleeBlock = scriptBlocks(text, SCRIPT_GUIDS.playerDamager)[0];
  const shooterBlock = scriptBlocks(text, SCRIPT_GUIDS.enemyProjectile)[0];
  const meleeDamage = meleeBlock ? numberField(meleeBlock, 'damageToGive') : -1;
  const projectileDamage = shooterBlock
    ? readDamageFromProjectile(prefabGuid(shooterBlock, 'projectile'))
    : -1;

  for (const enemyBlock of scriptBlocks(text, SCRIPT_GUIDS.enemy)) {
    const enemyName = field(enemyBlock, 'enemyName')?.trim();
    if (!enemyName) continue;
    const record = {
      contactDamage: numberField(enemyBlock, 'damageToGive', 0),
      meleeDamage,
      projectileDamage,
    };
    if (defaults[enemyName] && JSON.stringify(defaults[enemyName]) !== JSON.stringify(record)) {
      conflicts.push({ enemyName, kept: defaults[enemyName], ignored: record, prefabPath });
      continue;
    }
    defaults[enemyName] = record;
  }
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(defaults, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ outputPath, enemies: Object.keys(defaults).length, conflicts }, null, 2));
