# Hell Cemetery — Official Game Website

A dark gothic metroidvania web companion for **Hell Cemetery**, built with React, Vite, Firebase Auth, and Firebase Realtime Database.

## Features

- **Landing page** with hero section and game overview
- **Firebase Authentication** — login, logout, and optional account creation
- **Protected player profile** — view character stats, castle, market, and raid history data
- **Public enemies page** — loads from `/EnemySettings`
- **Public items page** — flexibly loads from multiple Firebase paths
- **Game data viewer** — `/GameData` debug page for rules-permitted data
- **Privacy policy** — editable content in `src/content/privacyPolicy.js`
- **Gothic dark fantasy UI** — responsive design for desktop and mobile

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Firebase

Copy the example environment file and fill in your Firebase project values:

```bash
cp .env.example .env
```

Edit `.env` with your Firebase config:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

> **Never commit `.env` to version control.** Firebase config lives in `src/firebase/firebaseConfig.js` and reads from these environment variables.

### Apple & Facebook Login

The web login page supports Firebase popup sign-in for:

- Apple provider ID: `apple.com`
- Facebook provider ID: `facebook.com`

Enable both providers in Firebase Console under Authentication -> Sign-in method, and make sure your web domain is authorized. For local testing, `localhost` is usually authorized by default; add `127.0.0.1` too if Firebase reports an unauthorized domain error.

### Admin Access & Two-Factor Authentication

Admin-only debug views are restricted in the UI to Firebase UID:

```text
PPe2ja8SlPRwmx1pLvnihWKhtqa2
```

The admin profile page can enable or disable an authenticator app using Firebase TOTP MFA. These controls are only shown to the admin UID. Enable multi-factor authentication and TOTP in Firebase Authentication before using it. Client-side hiding is not a substitute for database rules; keep private data protected by Realtime Database rules and do not make sensitive nodes publicly readable.

Admin users can edit enemy, item, and crafting recipe records directly from their catalog cards. These editors write back to Firebase and require rules that allow the admin UID to write `EnemySettings`, `ItemSettings` / `Items`, and `CraftingSettings` / recipe nodes. Enemy and recipe saves validate item references against the current item catalog before writing.

### 3. Run the development server

```bash
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173`).

### 4. Build for production

```bash
npm run build
npm run preview
```

## Netlify Deployment

This repo includes `netlify.toml`:

- Build command: `npm run build`
- Publish directory: `dist`
- SPA redirect: all routes serve `index.html`

Set the same `VITE_FIREBASE_*` variables from `.env.example` in Netlify site environment variables. Do not upload `.env`.

## Project Structure

```
src/
├── assets/images/          # Replace placeholder images here
├── components/             # Reusable UI components
├── content/                # Editable text content (privacy policy)
├── context/                # AuthContext
├── firebase/               # Firebase config & database helpers
├── pages/                  # Route pages
├── routes/                 # ProtectedRoute
├── styles/                 # Global CSS
└── utils/                  # Parsers (player character, etc.)
```

## Replacing Placeholder Images

Replace these files in `src/assets/images/` with your own assets (keep the same filenames or update imports):

| File | Used For |
|------|----------|
| `hero-placeholder.svg` | Home page hero background |
| `enemy-placeholder.svg` | Enemy cards when no image URL in Firebase |
| `item-placeholder.svg` | Item cards when no image URL in Firebase |
| `logo-placeholder.svg` | Navbar logo |

You can use PNG or JPG instead — just update the import paths in the components that reference them.

## Firebase Configuration

All Firebase setup is in:

- **`src/firebase/firebaseConfig.js`** — initializes the app, exports `auth` and `database`
- **`src/firebase/databaseService.js`** — helper functions for reading data

### Profile Page — Which Paths Are Read?

When a logged-in user visits `/profile`, the app reads these Firebase paths using their UID:

| Data | Firebase Path | Helper Function |
|------|---------------|-----------------|
| **Character / save data** | `/GameData/{uid}` (also supports Unity chunked saves under `/GameData/{uid}/chunks`) | `getPlayerCharacter(uid)` |
| Player profile | `/Players/{uid}` (also tries `/players/{uid}`) | `getPlayerProfile(uid)` |
| Castle | `/PlayerCastles/{uid}` | `getPlayerCastle(uid)` |
| Raid history | `/PlayerCastleRaidHistory/{uid}` | `getPlayerRaidHistory(uid)` |
| Market | `/PlayerMarket/Listings`, `/PlayerMarket/Payouts/{uid}`, `/PlayerMarket/ReturnedListings/{uid}`, `/PlayerMarket/SaleHistory` (also supports legacy `/PlayerMarket/{uid}`) | `getPlayerMarket(uid)` |

Character fields are parsed by `src/utils/playerParser.js` from nested Unity save data (e.g. `PlayerData`, `playerStats`, `inventoryItemsName`, `inventoryItemsAmount`, `PlayerPower`, `ClanInfo`).

To change paths later, edit `src/firebase/databaseService.js`.

### Enemies & Items Paths

- **Enemies:** `/EnemySettings`
- **Items:** tries `/GameData/Items`, `/Items`, `/GameData/items` in order
- **Game Data:** `/GameData` if your Firebase rules allow the current user to read it

## Firebase Security Rules

**Important:** Configure Realtime Database rules to protect player data. Users should only read their own profile:

```
auth != null && auth.uid == $uid
```

See **`firebase-rules-example.json`** for suggested rules including:

- Public read for `EnemySettings`, `Items`, and active market listings
- Private read/write for `Players/{uid}`, `GameData/{uid}`, `PlayerCastles/{uid}`, `PlayerCastleRaidHistory/{uid}`, and per-user market records
- Authenticated writes for shared player-market records used by the Unity client

Deploy rules in the [Firebase Console](https://console.firebase.google.com/) under Realtime Database → Rules.

## Editing the Privacy Policy

Edit `src/content/privacyPolicy.js` to update:

- `lastUpdated` date
- `contactEmail`
- Section titles and body text

## Routes

| Path | Access | Description |
|------|--------|-------------|
| `/` | Public | Home / landing page |
| `/login` | Public | Login & register |
| `/profile` | Protected | Player profile data |
| `/enemies` | Public | Enemy bestiary |
| `/items` | Public | Item catalog |
| `/game-data` | Public | GameData viewer |
| `/privacy-policy` | Public | Privacy policy |

## Tech Stack

- React 19
- Vite 6
- Firebase 11 (Auth + Realtime Database)
- React Router 7
- CSS Modules + global CSS

## License

Hell Cemetery © 2026. All rights reserved.
