# System Design Rules

## General
- Start with requirements and constraints.
- Break the system into clear components with defined responsibilities and data flows.
- Always present 2–3 clean options with explicit tradeoffs (performance, complexity, scalability, maintainability).
- Prefer simple, boring architectures unless complexity is justified.
- Define interfaces/contracts between components first.
- End every design response with a clear "Recommended Approach" section and a contract-ready summary.
- Never mix design with implementation.

## SpacePulse Architecture Reference

### Frontend Architecture (Feature-Sliced)
Each feature module (`src/features/<name>/`) contains:
- `types.ts` — Domain interfaces and enums
- `store.ts` — Zustand slice (client state + actions)
- `hooks/*.ts` — React Query hooks (server state) + custom hooks
- `*.tsx` — React components
- `index.ts` — Barrel export (public API of the module)

Shared infrastructure lives in `src/lib/`:
- `api/client.ts` — Axios HTTP wrapper (base URL from env)
- `api/websocket.ts` — Socket.io client with reconnection
- `store/index.ts` — Root Zustand store combining all slices
- `plugins/registry.ts` — Dynamic feature registration

### Backend Architecture
```
HTTP Request → Express middleware → Route handler → Service → External API / Cache
                                                         ↓
WebSocket ← Socket.io namespace ← Polling job (node-cron) → Cache update
```

Key design decisions already made:
- Cache abstraction: Redis-first, in-memory TTL fallback (no Redis required for dev)
- WebSocket namespaces: `/launches`, `/satellites`, `/weather` (separate concerns)
- Polling intervals: launches 60s, TLEs 30min, weather 60s
- Error handling: structured JSON responses via `middleware/errorHandler.ts`

### Data Flow: Globe Visualization
```
Celestrak TLE API → server/services/celestrak → Cache → REST /api/satellites/tle
                                                       → WebSocket /satellites namespace
Frontend: useSatelliteData hook → useTlePropagator (SGP4) → SatelliteLayer → Cesium entities
```

### Performance Constraints (from PRD)
- Globe: ≥30 FPS with 20k+ satellite entities (use Cesium LOD + culling)
- Data refresh: <5 seconds
- Globe interaction: sub-2-second response
- Backend: handle 10k+ concurrent WebSocket users
