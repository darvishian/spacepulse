# Coding Rules

## General
- Write clean, readable, well-commented code.
- Follow the language's official style guide.
- Add meaningful variable names and small functions.
- Never edit tests unless I explicitly allow it.
- Before writing code, re-read the contract and the design (if any).

## SpacePulse Coding Standards

### TypeScript
- Strict mode is enabled (`tsconfig.json`). All code must pass strict checks.
- Every function, hook, and component must have explicit return types.
- Use the existing type definitions in `src/features/<module>/types.ts` and `server/src/types/`. Extend them, don't duplicate.

### Frontend (Next.js 15 / React 19)
- App Router conventions: `'use client'` directive for interactive components, server components by default.
- Path aliases: use `@/` (maps to `src/`). Never use relative paths that escape two or more directories.
- Hooks: React Query for data fetching (`src/features/<module>/hooks/`), Zustand for local state (`src/features/<module>/store.ts`).
- Components: functional components only. Use `React.memo` / `useCallback` / `useMemo` where performance matters (especially globe entities).
- Styling: TailwindCSS utility classes only. Custom CSS goes in `src/app/globals.css` under the existing theme variables.
- Animations: Framer Motion for UI transitions, Cesium's built-in for globe animations.

### Backend (Express / Node.js)
- All routes in `server/src/routes/`, services in `server/src/services/`.
- Every route handler delegates to a service function — no business logic in route files.
- Use the cache abstraction (`server/src/cache/`) for all external API calls. Set appropriate TTLs.
- WebSocket events go through `server/src/websocket/handlers.ts`. Use namespace separation (`/launches`, `/satellites`, `/weather`).
- Polling jobs live in `server/src/jobs/`. Register new jobs via `scheduler.registerJob()`.

### Key Libraries & Patterns
- **CesiumJS/Resium**: Globe rendering in `src/features/globe/GlobeContainer.tsx`. Use CZML for streaming data.
- **satellite.js**: SGP4 propagation in `src/features/satellites/hooks/useTlePropagator.ts`.
- **Recharts**: Charts in `src/features/graphs/SatelliteGrowthChart.tsx`.
- **Socket.io**: Client wrapper in `src/lib/api/websocket.ts`, server setup in `server/src/websocket/`.
