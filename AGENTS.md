# FORGE

Personal fitness-tracking PWA. React 19 + Vite 8 + TypeScript, single-page app. Zero backend: all state persists in browser `localStorage` under the key `forge_v1`. No database, no API, no environment variables.

## Cursor Cloud specific instructions

- Single service only: the Vite dev server. There is no backend/DB/queue to run.
- Standard commands live in `package.json`: `npm run dev` (dev server on port 5173), `npm run build` (`tsc -b && vite build`), `npm run lint` (oxlint), `npm run preview` (serves the production build on port 4173).
- All app state is client-side in `localStorage` (`forge_v1`). To reset to seed data, clear site data / `localStorage` in the browser; there is nothing server-side to migrate or seed.
- The dev server binds to localhost only (no `--host`). Use `http://localhost:5173/` from the in-VM browser; add `--host` if you need to expose it on the network.
- `npm run lint` currently reports one pre-existing `react/only-export-components` warning in `src/store/StoreContext.tsx` (non-blocking, exit code 0).
- `npm run build` prints a chunk-size (>500 kB) warning; this is expected and does not fail the build.
- `index.html` loads Google Fonts via CDN; fonts gracefully fall back if there's no outbound internet, so the app still works offline.
