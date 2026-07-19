# Hell Cemetery web-admin memory

Read this file before working in this repository.

## Linked projects

- React/Firebase web admin: `D:\My projects\Hell Cemetery Web`
- Unity game: `D:\Unity\Hell Cemetery Metroivania`

This web app is the admin companion for the Unity game. Remote game-data changes may require coordinated schema and runtime changes in the Unity repository.

## Enemy configuration

- Canonical Firebase path: `EnemySettings/Categories/{category}/{enemyKey}/enemyStats`
- Web enemy editor: `src/components/EnemyAdminEditor.jsx`
- Web enemy parser: `src/utils/enemyParser.js`
- Unity schema: `D:\Unity\Hell Cemetery Metroivania\Assets\2. Scripts\EnemyScript\EnemyConfig.cs`
- Unity runtime consumer: `D:\Unity\Hell Cemetery Metroivania\Assets\2. Scripts\EnemyScript\Enemy.cs`

Enemy damage meanings:

- `damageToGive`: contact damage.
- `meleeDamage`: melee attack-hitbox damage.
- `projectileDamage`: shooter projectile damage.
- Missing melee/projectile fields mean Unity should keep prefab defaults.

## Working rules

- Preserve unrelated worktree changes.
- Never expose or commit `.env` or Firebase credentials.
- Run `npm run build` after web changes.
