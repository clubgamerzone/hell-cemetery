# Hell Cemetery web-admin memory

Read this file before working in this repository.

## Linked projects

- React/Firebase web admin: `D:\My projects\Hell Cemetery Web`
- Unity game: `D:\Unity\Hell Cemetery Metroivania`
- Web GitHub remote: `https://github.com/clubgamerzone/hell-cemetery.git`
- Netlify deploys from the pushed web repository.

This web app is the admin companion for the Unity game. Remote game-data changes may require coordinated schema and runtime changes in the Unity repository.

## Updating and publishing this website

Use this flow when the user asks to update or push the web project:

1. Work from `D:\My projects\Hell Cemetery Web`.
2. Inspect pending work with `git status -sb` and preserve unrelated changes.
3. Make the requested web edits.
4. Run `npm run build` before committing.
5. Stage only intended web files, unless the user explicitly asks to push everything pending.
6. Commit with a clear message.
7. Push with `git push origin main` unless the user explicitly asks for another branch.

Never commit `.env`, Firebase service-account JSON, Google plist/json secrets, credential backups, or local deployment tokens.

## Running the local web dev server

Use this command from `D:\My projects\Hell Cemetery Web` when the user asks to run or preview the website locally:

```powershell
npx vite --host 127.0.0.1 --port 5173
```

Open the site at `http://127.0.0.1:5173/`.

If port `5173` is already busy, stop the existing process on that port before restarting Vite, or use another port if the user only needs a temporary preview. The in-app browser may block `localhost`, so prefer `127.0.0.1`.

## Enemy configuration

- Canonical Firebase path: `EnemySettings/Categories/{category}/{enemyKey}/enemyStats`
- Web enemy editor: `src/components/EnemyAdminEditor.jsx`
- Web enemy parser: `src/utils/enemyParser.js`
- Web prefab damage defaults: `src/data/enemyDamageDefaults.json`
- Unity prefab damage sync script: `scripts/extract-unity-enemy-damage-defaults.mjs`
- Unity schema: `D:\Unity\Hell Cemetery Metroivania\Assets\2. Scripts\EnemyScript\EnemyConfig.cs`
- Unity loader: `D:\Unity\Hell Cemetery Metroivania\Assets\2. Scripts\EnemyScript\EnemyConfigManager.cs`
- Unity runtime consumer: `D:\Unity\Hell Cemetery Metroivania\Assets\2. Scripts\EnemyScript\Enemy.cs`
- Unity upload/editor tooling: `D:\Unity\Hell Cemetery Metroivania\Assets\2. Scripts\Editor\EnemyConfigUploader.cs`

Enemy damage meanings:

- `damageToGive`: contact damage.
- `meleeDamage`: melee attack-hitbox damage.
- `projectileDamage`: shooter projectile damage.
- Missing melee/projectile fields mean Unity should keep prefab defaults.

If Unity enemy prefab damage values change, refresh the web defaults here with:

```powershell
npm run sync:enemy-damage-defaults
npm run build
git add package.json scripts/extract-unity-enemy-damage-defaults.mjs src/data/enemyDamageDefaults.json src/utils/enemyParser.js src/components/EnemyAdminEditor.jsx src/components/EnemyDetailPanel.jsx
git commit -m "Update enemy damage defaults"
git push origin main
```

The sync script reads Unity prefabs from `D:\Unity\Hell Cemetery Metroivania` by default. To use another Unity checkout temporarily, set `HELL_CEMETERY_UNITY_ROOT` before running the script.

## Unity compatibility checklist

## Subweapon configuration

- Canonical Firebase path: `SubweaponSettings/subweapons/{knife|fireball|hammer}`.
- Admin-only web page/defaults: `src/pages/SubweaponsPage.jsx` and `src/data/subweaponDefaults.js`; navigation and direct page access require `isAdmin`.
- Unity schema, loader, and runtime consumer: `D:\Unity\Hell Cemetery Metroivania\Assets\2. Scripts\Player\SubWeapons.cs`.
- Unity runtime consumer: `D:\Unity\Hell Cemetery Metroivania\Assets\2. Scripts\Player\SubWeapons.cs`.
- The web shows prefab defaults when Firebase has no entry; only pressing Save writes the selected entry.

- When adding or renaming remote game-data fields, update Unity schema/loading/runtime and the web parser/editor together.
- Keep Firebase paths stable unless both Unity and web are migrated in the same task.
- Missing optional Firebase fields should preserve Unity prefab defaults where possible.
- Admin edits in the web app must write values Unity can parse in native builds and WebGL REST/shim builds.

## Working rules

## Global game balance configuration

- Canonical Firebase path: `GameBalanceSettings`.
- Admin page: `src/pages/BalanceSettingsPage.jsx` at `/balance-settings`.
- Fields/defaults: `lootRate: 1`, `experienceRate: 1`, `respawnRate: 1`, `additionalRespawnSeconds: 0`.
- Loot formula: `effectiveChance = clamp01(baseChance * lootRate)`.
- Experience formula: `effectiveExperience = baseExperience * experienceRate`.
- Respawn formula: `finalSeconds = baseEnemyRespawnSeconds * respawnRate + additionalRespawnSeconds`.
- Unity loader/runtime: `D:\Unity\Hell Cemetery Metroivania\Assets\2. Scripts\EnemyScript\RespawnScript.cs`, with consumers in `EnemyLootManager.cs` and `EnemyHealth.cs`.
- Realtime Database rule should allow public reads and writes only by admin UID `PPe2ja8SlPRwmx1pLvnihWKhtqa2`.

- Preserve unrelated worktree changes.
- Never expose or commit `.env` or Firebase credentials.
- Run `npm run build` after web changes.
