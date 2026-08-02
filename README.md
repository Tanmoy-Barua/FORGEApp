# FORGE

**Train for the race. Track for life.**

A personal fitness OS built around one big goal (HYROX Anaheim) sitting on top of an everyday engine for strength, running, food, bodyweight, sleep, and habits. Mobile-first, offline-capable, one-handed logging between deliveries.

## Stack

- React + Vite + TypeScript
- localStorage persistence (zero-backend MVP)
- Recharts for trends & heatmap
- PWA-ready (`vite-plugin-pwa`)

## Run

```bash
npm install
npm run dev
```

```bash
npm run build
npm run preview
```

## What's in

- **Home** — race countdown, today card, daily rings, streak, checklist, weight trend, consistency heatmap
- **Train** — weekly plan, strength logger (sets / RPE / rest timer / PRs), running log, HYROX stations + Saturday simulation + readiness meter
- **Fuel** — personal food library, meal templates, macro rings, water tracker, pre-workout nudge
- **Body** — weight + 7-day average, measurements, body comp, sleep, private progress photos
- **Settings** — targets, race date, JSON/CSV export & import

## Design

Dark race-dashboard aesthetic: near-black `#0B0B0D`, charcoal cards `#16161A`, electric lime accent `#D7FF00`. Barlow Condensed for numbers, DM Sans for body. Floating **＋ Log** on every screen.
