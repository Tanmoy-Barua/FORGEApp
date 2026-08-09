# fogerapp

**Train for the race. Track for life.**

A personal fitness OS built around one big goal (HYROX Anaheim) sitting on top of an everyday engine for strength, running, food, bodyweight, sleep, and habits. Mobile-first, offline-capable, one-handed logging between deliveries.

## Live app

**Permanent (Vercel):** https://fogerapp.vercel.app  
*(after the one-time Vercel deploy below)*

Whoop OAuth redirect URI:

```text
https://fogerapp.vercel.app/whoop/callback
```

Temporary Cloudflare tunnels (e.g. `*.trycloudflare.com`) only work while that tunnel process is running and get a new random URL on every restart — they are **not** always-online.

## Stack

- React + Vite + TypeScript
- localStorage cache (offline-first)
- **Firebase Auth + Firestore** cloud sync (phone ↔ laptop)
- Recharts
- PWA (`vite-plugin-pwa`)
- **Vercel** hosting

## Run locally

```bash
npm install
cp .env.example .env   # fill Firebase keys
npm run dev
```

```bash
npm run build
npm run preview
```

Without Firebase env vars the app still works fully offline via localStorage. Cloud sync appears in **Settings** once configured.

---

## Firebase setup (cloud database)

1. Create a project at [Firebase Console](https://console.firebase.google.com/).
2. Add a **Web app** → copy the config into `.env` / Vercel env vars:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
3. **Authentication** → Sign-in method → enable **Email/Password**.
4. **Firestore Database** → Create database (production mode) → publish rules from `firestore.rules`:

```bash
# optional, if you have Firebase CLI logged in
npx firebase-tools deploy --only firestore:rules
```

Or paste `firestore.rules` in the console Rules tab.

### How sync works

- Sign in from **Settings → Cloud sync**
- App state lives at `users/{uid}/data/forge`
- Local edits debounce-push (~900ms); remote changes stream live
- **Progress photos stay device-local** (never uploaded)
- localStorage remains the offline cache

---

## Vercel hosting (always-online link)

Project name is set to **`fogerapp`** in `vercel.json`, so production should be:

**https://fogerapp.vercel.app**

### Option A — Import the GitHub repo (recommended)

1. Go to [vercel.com/new](https://vercel.com/new) → import `Tanmoy-Barua/FORGEApp`
2. Set **Project Name** to `fogerapp`
3. Framework: **Vite** · Output: `dist`
4. Root directory: repo root · Production branch: `main`
5. Optional: add `VITE_FIREBASE_*` and `VITE_WHOOP_*` env vars
6. Deploy
7. In Whoop developer dashboard, set redirect URI to  
   `https://fogerapp.vercel.app/whoop/callback`
8. In Firebase Auth → Authorized domains, add `fogerapp.vercel.app`

### Option B — CLI

```bash
npx vercel login
npx vercel link --yes --project fogerapp
npx vercel --prod --yes
```

Set env vars (optional):

```bash
npx vercel env add VITE_FIREBASE_API_KEY
# …repeat for each VITE_FIREBASE_* / VITE_WHOOP_* key
```

---

## Wearables

### Whoop
1. Create an app at [developer-dashboard.whoop.com](https://developer-dashboard.whoop.com)
2. Set redirect URI to `https://YOUR_DOMAIN/whoop/callback`
3. In FORGE **Settings → Wearables**, paste Client ID + Secret → **Connect Whoop** → **Sync**
4. Deploy on **Vercel** so `/api/whoop-token` and `/api/whoop-proxy` can bypass browser CORS

Pulls sleep, recovery (shown on Home), strain, and body weight. Requires an active Whoop membership.

### Apple Health
Web apps can’t read HealthKit live. On iPhone: **Health → profile → Export All Health Data** → unzip → import `export.xml` in Settings. Imports sleep, steps, and weight.

## What's in the app

- **Home** — race countdown, today card, daily rings, streak, checklist, recovery, weight trend, heatmap
- **Train** — weekly plan, strength logger, running log, HYROX stations / simulation / readiness
- **Fuel** — food library, meal templates, macro rings, water tracker
- **Body** — weight, measurements, body comp, sleep, private photos
- **＋ Quick log** — floating FAB
- **Settings** — cloud sync, Whoop / Apple Health, targets, JSON/CSV export

## Design

Dark race-dashboard aesthetic: `#0B0B0D` / `#16161A` / accent `#D7FF00`. Barlow Condensed for numbers, DM Sans for body.
