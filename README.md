# FORGE

**Train for the race. Track for life.**

A personal fitness OS built around one big goal (HYROX Anaheim) sitting on top of an everyday engine for strength, running, food, bodyweight, sleep, and habits. Mobile-first, offline-capable, one-handed logging between deliveries.

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

## Vercel hosting

### Option A — Import the GitHub repo

1. Go to [vercel.com/new](https://vercel.com/new) → import `Tanmoy-Barua/FORGEApp`
2. Framework: **Vite** (auto-detected). Output: `dist`
3. Add the six `VITE_FIREBASE_*` env vars
4. Deploy. SPA rewrites are in `vercel.json`.

### Option B — CLI

```bash
npx vercel login
npx vercel          # preview
npx vercel --prod   # production
```

Set env vars:

```bash
npx vercel env add VITE_FIREBASE_API_KEY
# …repeat for each VITE_FIREBASE_* key
```

Custom domain (optional): Project → Settings → Domains.

---

## What's in the app

- **Home** — race countdown, today card, daily rings, streak, checklist, weight trend, heatmap
- **Train** — weekly plan, strength logger, running log, HYROX stations / simulation / readiness
- **Fuel** — food library, meal templates, macro rings, water tracker
- **Body** — weight, measurements, body comp, sleep, private photos
- **＋ Quick log** — floating FAB
- **Settings** — cloud sync, targets, JSON/CSV export

## Design

Dark race-dashboard aesthetic: `#0B0B0D` / `#16161A` / accent `#D7FF00`. Barlow Condensed for numbers, DM Sans for body.
