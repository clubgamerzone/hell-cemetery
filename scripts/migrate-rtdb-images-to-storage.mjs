import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envPath = path.join(projectRoot, '.env');
const tempRoot = path.join(projectRoot, '.migration-cache', 'rtdb-images');

function loadEnv(text) {
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index < 0) continue;
    env[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim();
  }
  return env;
}

function slug(value, fallback = 'unnamed') {
  const result = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return result || fallback;
}

function extensionForMime(mimeType) {
  const normalized = String(mimeType || '').toLowerCase();
  if (normalized.includes('jpeg') || normalized.includes('jpg')) return 'jpg';
  if (normalized.includes('webp')) return 'webp';
  return 'png';
}

function parseDataUrlOrBase64(value, fallbackMimeType) {
  if (!value) return null;
  const text = String(value);
  const match = text.match(/^data:([^;]+);base64,(.*)$/s);
  if (match) {
    return { mimeType: match[1], base64: match[2] };
  }
  return { mimeType: fallbackMimeType || 'image/png', base64: text };
}

function pngDimensions(buffer) {
  if (buffer.length >= 24 && buffer.toString('ascii', 1, 4) === 'PNG') {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  return {};
}

function jpegDimensions(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return {};
  let offset = 2;
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) break;
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }
    offset += 2 + length;
  }
  return {};
}

function webpDimensions(buffer) {
  if (buffer.length < 30 || buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WEBP') {
    return {};
  }
  const chunk = buffer.toString('ascii', 12, 16);
  if (chunk === 'VP8X' && buffer.length >= 30) {
    return {
      width: 1 + buffer.readUIntLE(24, 3),
      height: 1 + buffer.readUIntLE(27, 3),
    };
  }
  return {};
}

function imageDimensions(buffer, mimeType) {
  const normalized = String(mimeType || '').toLowerCase();
  if (normalized.includes('png')) return pngDimensions(buffer);
  if (normalized.includes('jpeg') || normalized.includes('jpg')) return jpegDimensions(buffer);
  if (normalized.includes('webp')) return webpDimensions(buffer);
  return { ...pngDimensions(buffer), ...jpegDimensions(buffer), ...webpDimensions(buffer) };
}

function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')}\n${result.error?.message || ''}\n${result.stdout || ''}\n${result.stderr || ''}`);
  }
  return result.stdout;
}

function runGcloud(args) {
  if (process.platform !== 'win32') {
    run('gcloud', args);
    return;
  }

  const quote = (value) => `"${String(value).replace(/"/g, '\\"')}"`;
  const command = `gcloud ${args.map(quote).join(' ')}`;
  const result = spawnSync(command, { encoding: 'utf8', shell: true, stdio: ['ignore', 'pipe', 'pipe'] });
  if (result.status !== 0) {
    throw new Error(`${command}\n${result.error?.message || ''}\n${result.stdout || ''}\n${result.stderr || ''}`);
  }
}

function runGcloudOutput(args) {
  if (process.platform !== 'win32') {
    return run('gcloud', args).trim();
  }

  const quote = (value) => `"${String(value).replace(/"/g, '\\"')}"`;
  const command = `gcloud ${args.map(quote).join(' ')}`;
  const result = spawnSync(command, { encoding: 'utf8', shell: true, stdio: ['ignore', 'pipe', 'pipe'] });
  if (result.status !== 0) {
    throw new Error(`${command}\n${result.error?.message || ''}\n${result.stdout || ''}\n${result.stderr || ''}`);
  }
  return result.stdout.trim();
}

function withAccessToken(url, accessToken) {
  if (!accessToken) return url;
  const parsed = new URL(url);
  parsed.searchParams.set('access_token', accessToken);
  return parsed.toString();
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`GET ${url} failed: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

async function patchJson(url, value, accessToken) {
  const response = await fetch(withAccessToken(url, accessToken), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(value),
  });
  if (!response.ok) {
    throw new Error(`PATCH ${url} failed: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

async function collectImages(databaseUrl) {
  const images = [];
  const itemSettings = await fetchJson(`${databaseUrl}/ItemSettings/items.json`);
  for (const [key, item] of Object.entries(itemSettings || {})) {
    if (!item?.imageBase64) continue;
    images.push({
      kind: 'item',
      label: item.itemName || key,
      databasePath: `ItemSettings/items/${key}`,
      storagePath: `game-assets/items/${slug(key)}/icon.${extensionForMime(item.imageMimeType)}`,
      base64: item.imageBase64,
      mimeType: item.imageMimeType || 'image/png',
      patchFields: {
        imageStoragePath: null,
        imageUrl: null,
        imageBase64: null,
        imageVersion: null,
        imageWidth: null,
        imageHeight: null,
      },
    });
  }

  const enemySettings = await fetchJson(`${databaseUrl}/EnemySettings/Categories.json`);
  for (const [categoryKey, category] of Object.entries(enemySettings || {})) {
    for (const [enemyKey, enemyRecord] of Object.entries(category || {})) {
      const stats = enemyRecord?.enemyStats || enemyRecord;
      if (!stats || typeof stats !== 'object') continue;
      const baseStoragePath = `game-assets/enemies/${slug(categoryKey)}/${slug(enemyKey)}`;
      const databasePath = `EnemySettings/Categories/${categoryKey}/${enemyKey}/enemyStats`;
      if (stats.encyclopediaPortraitBase64) {
        images.push({
          kind: 'enemyPortrait',
          label: `${categoryKey}/${enemyKey} portrait`,
          databasePath,
          storagePath: `${baseStoragePath}/portrait.${extensionForMime(stats.encyclopediaPortraitMimeType)}`,
          base64: stats.encyclopediaPortraitBase64,
          mimeType: stats.encyclopediaPortraitMimeType || 'image/png',
          patchFields: {
            encyclopediaPortraitStoragePath: null,
            encyclopediaPortraitUrl: null,
            encyclopediaPortraitBase64: null,
            encyclopediaPortraitVersion: null,
            encyclopediaPortraitWidth: null,
            encyclopediaPortraitHeight: null,
          },
        });
      }
      if (stats.encyclopediaCardFrameBase64) {
        images.push({
          kind: 'enemyFrame',
          label: `${categoryKey}/${enemyKey} frame`,
          databasePath,
          storagePath: `${baseStoragePath}/frame.${extensionForMime(stats.encyclopediaCardFrameMimeType)}`,
          base64: stats.encyclopediaCardFrameBase64,
          mimeType: stats.encyclopediaCardFrameMimeType || 'image/png',
          patchFields: {
            encyclopediaCardFrameStoragePath: null,
            encyclopediaCardFrameUrl: null,
            encyclopediaCardFrameBase64: null,
            encyclopediaCardFrameVersion: null,
            encyclopediaCardFrameWidth: null,
            encyclopediaCardFrameHeight: null,
          },
        });
      }
    }
  }

  return images;
}

async function migrate() {
  const dryRun = process.argv.includes('--dry-run');
  const keepBase64 = process.argv.includes('--keep-base64');
  const env = loadEnv(await fs.readFile(envPath, 'utf8'));
  const databaseUrl = env.VITE_FIREBASE_DATABASE_URL?.replace(/\/$/, '');
  const bucket = env.VITE_FIREBASE_STORAGE_BUCKET;
  if (!databaseUrl || !bucket) {
    throw new Error('Missing VITE_FIREBASE_DATABASE_URL or VITE_FIREBASE_STORAGE_BUCKET in .env');
  }
  const databaseAccessToken = dryRun
    ? ''
    : (process.env.FIREBASE_DATABASE_ACCESS_TOKEN || runGcloudOutput(['auth', 'print-access-token']));

  await fs.mkdir(tempRoot, { recursive: true });
  const images = await collectImages(databaseUrl);
  const totalBytes = images.reduce((sum, image) => sum + Buffer.byteLength(parseDataUrlOrBase64(image.base64, image.mimeType).base64, 'base64'), 0);
  console.log(`Found ${images.length} RTDB Base64 image(s), decoded size ${(totalBytes / 1024 / 1024).toFixed(2)} MB.`);
  if (dryRun) {
    images.slice(0, 20).forEach((image) => console.log(`- ${image.databasePath} -> gs://${bucket}/${image.storagePath}`));
    if (images.length > 20) console.log(`...and ${images.length - 20} more`);
    return;
  }

  const patches = new Map();
  for (let index = 0; index < images.length; index++) {
    const image = images[index];
    const parsed = parseDataUrlOrBase64(image.base64, image.mimeType);
    const buffer = Buffer.from(parsed.base64, 'base64');
    const dimensions = imageDimensions(buffer, parsed.mimeType);
    const token = crypto.randomUUID();
    const localPath = path.join(tempRoot, image.storagePath);
    await fs.mkdir(path.dirname(localPath), { recursive: true });
    await fs.writeFile(localPath, buffer);

    const gsPath = `gs://${bucket}/${image.storagePath}`;
    console.log(`[${index + 1}/${images.length}] Uploading ${image.label} -> ${gsPath}`);
    runGcloud([
      'storage',
      'cp',
      localPath,
      gsPath,
      '--content-type',
      parsed.mimeType,
      '--custom-metadata',
      `firebaseStorageDownloadTokens=${token}`,
    ]);

    const encodedPath = encodeURIComponent(image.storagePath);
    const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath}?alt=media&token=${token}`;
    const patch = { ...image.patchFields };
    const prefix = image.kind === 'item' ? 'image' : image.kind === 'enemyPortrait' ? 'encyclopediaPortrait' : 'encyclopediaCardFrame';
    patch[`${prefix}StoragePath`] = image.storagePath;
    patch[`${prefix}Url`] = downloadUrl;
    patch[`${prefix}Version`] = Date.now();
    patch[`${prefix}Width`] = dimensions.width || null;
    patch[`${prefix}Height`] = dimensions.height || null;
    if (keepBase64) {
      delete patch[`${prefix}Base64`];
    }

    patches.set(image.databasePath, { ...(patches.get(image.databasePath) || {}), ...patch });
  }

  for (const [databasePath, patch] of patches) {
    console.log(`Patching ${databasePath}`);
    await patchJson(`${databaseUrl}/${databasePath}.json`, patch, databaseAccessToken);
  }

  console.log(`Done. Uploaded ${images.length} image(s), patched ${patches.size} RTDB node(s).`);
}

migrate().catch((error) => {
  console.error(error);
  process.exit(1);
});
