# SpacePulse — Development Progress Contract

**Created**: 2026-03-27
**Last Updated**: 2026-03-27
**Status**: Phase 1D (Satellite Growth Chart) COMPLETE → Ready for Phase 1E

---

## Project Overview

SpacePulse is a real-time space activity monitoring dashboard built with Next.js 15, CesiumJS, and an Express backend. The full scaffold (93 files) is in place with typed stubs, TODO comments, and all configuration ready.

## What Is Done (Scaffold — Complete)

### Frontend (57 source files)
- [x] Next.js 15 App Router project with TypeScript strict mode
- [x] TailwindCSS dark-space theme (#0a0a2a, neon accents)
- [x] 6 feature modules (globe, satellites, launches, graphs, weather, investments) — all with types, store slices, hooks, components, barrel exports
- [x] Plugin registry system (`registerFeature()` pattern)
- [x] Root Zustand store with persistence middleware
- [x] API client (Axios) + WebSocket client (Socket.io) wrappers
- [x] React Query provider setup
- [x] Shared UI components: Sidebar, DetailPanel, TimelineScrubber, SearchBar, Toast, DebugOverlay, ThemeProvider
- [x] DashboardLayout composing all sections
- [x] ESLint, Prettier, Storybook, Playwright configs

### Backend (25 source files, ~3,300 lines)
- [x] Express server with TypeScript
- [x] REST routes: 19 endpoints across 4 domains (launches, satellites, weather, investments)
- [x] Service layer with stubs for Celestrak, SpaceX, NOAA SWPC, CZML generation
- [x] WebSocket namespaces: `/launches`, `/satellites`, `/weather`
- [x] Polling jobs via node-cron (launches 60s, TLEs 30min, weather 60s)
- [x] Cache abstraction: Redis-first with in-memory TTL fallback
- [x] Rate limiting, CORS, helmet, compression middleware
- [x] Structured error handling + graceful shutdown

### Configuration
- [x] `package.json` (frontend + backend)
- [x] TypeScript strict configs
- [x] CesiumJS webpack config in `next.config.ts`
- [x] Environment templates (`.env.example`)

---

## What Needs To Be Built (Implementation Phases)

### Phase 1 — MVP (Target: 8 weeks)

#### 1A. Core Cesium Globe ✅ COMPLETE (2026-03-27)
- [x] Initialize Cesium Viewer in `GlobeContainer.tsx` with Resium
- [x] Configure ion token, terrain, and base imagery layers
- [x] Implement mouse/touch orbit, zoom, tilt controls
- [x] Set up time scrubber (past/future simulation)
- [x] Add layer toggle system (satellites, launches, debris, weather)
- [x] Implement entity click → DetailPanel flow

**1A Implementation Notes:**
- **Files created:** `src/features/globe/store.ts` (GlobeStore — Zustand store for layers, clock, viewer ref, entity selection)
- **Files modified:** `types.ts` (added GlobeStore, ClockState, TimeScale, LayerConfig defaults, GlobeViewerInstance with Cesium types), `GlobeContainer.tsx` (Resium Viewer with terrain, lighting, atmosphere, entity click handler via ScreenSpaceEventHandler), `GlobeControls.tsx` (layer toggles with opacity sliders reading from GlobeStore), `CzmlDataSource.tsx` (loads CZML from URL or inline data into viewer), `hooks/useGlobeViewer.ts` (stable API wrapping viewer ref — addEntity, removeEntity, setCameraView, flyTo), `index.ts` (added store export), `TimelineScrubber.tsx` (drives GlobeStore clock — play/pause, skip ±1h, time scale 1x–60x, reset to now), `DetailPanel.tsx` (reads selectedGlobeEntity from GlobeStore, shows name/type/position/properties)
- **Dep fixes:** `package.json` updated resium to ^1.20.0, cesium to ^1.139.0, satellite.js to ^5.0.0
- **Architecture:** GlobeStore is the central state bus — GlobeContainer sets the viewer ref on mount, TimelineScrubber drives clock state, GlobeControls drives layer visibility, entity clicks flow through GlobeStore → RootStore → DetailPanel
- **Pre-existing TS errors:** 39 errors remain in scaffold stubs (unused vars, framer-motion type mismatch, constellation typing) — none in 1A files

#### 1B. Satellite Visualization ✅ COMPLETE (2026-03-27)
- [x] Connect `celestrak.service.ts` to real Celestrak TLE API
- [x] Implement TLE parsing in service layer
- [x] Wire `useSatelliteData` hook to backend `/api/satellites/tle`
- [x] Implement SGP4 propagation in `useTlePropagator` using satellite.js
- [x] Render 20k+ satellite entities on globe with LOD/culling
- [x] Color-code constellations (Starlink, OneWeb, etc.)
- [x] Add constellation grouping toggle + bounding box

**1B Implementation Notes:**
- **Backend — `celestrak.service.ts`**: Real Celestrak API integration via `gp.php?GROUP=<name>&FORMAT=tle`. Fetches active TLEs (~8k sats), constellation-specific TLEs (Starlink, OneWeb, Iridium, GPS, GLONASS, Galileo, Beidou, Planet, Spire, Telesat). Full 3-line TLE parsing with epoch date calculation, orbital element extraction, validation. Server-side approximate position computation for single-satellite lookups. Mock data fallback on API failure.
- **Backend — `routes/satellites.ts`**: Constellation metadata endpoint with 10 built-in constellations (operator, orbit type, purpose, website). Live satellite counts fetched from Celestrak TLE data per constellation. Growth endpoint with static historical data.
- **Frontend — `useSatelliteData.ts`**: React Query hooks hitting `/api/satellites/tle` and `/api/satellites/constellations`. Maps backend TleRecord (satelliteId/satelliteName) → frontend TleRecord (id/name). 30min staleTime, 1hr refetch for TLEs. 24hr staleTime for constellations.
- **Frontend — `useTlePropagator.ts`**: Full SGP4 propagation via `satellite.js` — `twoline2satrec`, `propagate`, `gstime`, `eciToGeodetic`. Exports `propagateTle()` (single), `propagateBatch()` (bulk for 20k+), `useTlePropagator()` (hook), `useContinuousPropagation()` (timer hook). Computes lat/lon/alt/velocity/heading/footprint.
- **Frontend — `SatelliteLayer.tsx`**: Uses Cesium `PointPrimitiveCollection` (not individual Entities) for GPU-efficient rendering of 25k points. `NearFarScalar` for LOD scaling, `DistanceDisplayCondition` for culling. 11 constellation colors (Starlink cyan, OneWeb orange, etc.). 3-second propagation interval synced to Cesium clock (supports time scrubber). Click handler via `ScreenSpaceEventHandler` → GlobeStore → DetailPanel. Filter support via SatelliteStore filters.
- **Frontend — `ConstellationGroup.tsx`**: Constellation list with satellite counts, orbit type badges, operator names. Toggle selection (click to filter, click again to show all). Color badges matching SatelliteLayer colors. Sorted by satellite count descending.
- **Frontend — `store.ts`**: `useFilteredSatellites()` selector with filtering by constellation name (heuristic), orbit type (altitude-based), altitude range, and search query. `classifyOrbitByAltitude()` helper. Devtools middleware for debugging.
- **Architecture**: Backend fetches + caches TLEs from Celestrak → Frontend React Query fetches from backend → `propagateBatch()` runs SGP4 on all TLEs against Cesium clock time → `PointPrimitiveCollection` renders positions → 3s interval re-propagates → constellation filter narrows visible set
- **Pre-existing TS errors**: Same 39 scaffold stub errors remain (unused vars, framer-motion, etc.) — zero new errors in 1B files

#### 1C. Live Launches ✅ COMPLETE (2026-03-27)
- [x] Connect `launches.service.ts` to RocketLaunch.Live + SpaceX APIs
- [x] Wire `useLaunches` hook to backend `/api/launches`
- [x] Render launch pins on globe (`LaunchPin.tsx`)
- [x] Show rocket name + payload labels (e.g., "Falcon 9 • Starlink Group 12-3")
- [x] Implement LaunchDetail side panel (T+ countdown, info)
- [x] Build sortable LaunchList table synced with globe
- [x] "Show Last 10 Launches" button → dotted historical trajectories with fade

**1C Implementation Notes:**
- **Backend — `launches.service.ts`**: Dual-source API integration. Primary: RocketLaunch.Live (`fdo.rocketlaunch.live/json/launches/next|previous/N`). Secondary: SpaceX v4 API (`api.spacexdata.com/v4/launches/upcoming|past` + `/v4/launchpads` for coordinates). Mock fallback with 4 upcoming + 6 recent realistic launches. Deduplication by fuzzy name matching. Well-known launch site coordinate lookup table (23 sites: Cape Canaveral, Vandenberg, Baikonur, Kourou, Wenchang, Mahia, etc.).
- **Backend — `types/launch.ts`**: Extended enums — `LaunchProvider` now includes ULA, ARIANESPACE, ROSCOSMOS, ISRO, CASC, JAXA. `LaunchStatus` now includes IN_FLIGHT, SUCCESS, FAILURE for historical launches.
- **Backend — `routes/launches.ts`**: Fixed route ordering bug — `/recent` and `/summary` now defined before `/:id` to prevent Express matching them as ID params.
- **Frontend — `types.ts`**: Aligned enums to backend conventions. Added `LaunchApiRecord` interface for raw API response mapping. Added `STATUS_COLORS`, `STATUS_LABELS`, `PROVIDER_LABELS` display helper maps.
- **Frontend — `hooks/useLaunches.ts`**: Full mapping layer: `mapApiRecordToLaunch()` transforms backend `LaunchApiRecord` (scheduledTime/location/vehicle/payloads) → frontend `Launch` (launchDate/launchSite/rocketType/payload). New `useRecentLaunches(days)` hook. React Query with 5min staleTime/refetch for upcoming, 10min for recent.
- **Frontend — `LaunchPin.tsx`**: Rewrote as Cesium BillboardCollection + LabelCollection layer (follows SatelliteLayer pattern). Status-colored pins with NearFarScalar LOD. Labels show "Falcon 9 · Starlink Group 12-3" format, auto-hide at distance. Click handler → GlobeStore → DetailPanel with camera flyTo. Supports both upcoming (solid) and recent (faded) pins.
- **Frontend — `LaunchDetail.tsx`**: Live T± countdown timer updating every 1s (`T- 3d 14h 22m 8s` / `T+ 1d 5h`). Status badge with color. Launch window display. Coordinates display. "View on Map" flyTo button. Webcast link button.
- **Frontend — `LaunchList.tsx`**: Fully sortable table by name/date/provider/status with proper value extraction. Relative time labels ("in 3d", "2h ago"). Globe sync: row click → GlobeStore entity + camera flyTo. "Recent" toggle button for showing/hiding historical launches. Status badges with color coding.
- **Frontend — `TrajectoryOverlay.tsx`**: Generates approximate trajectory arcs from launch site using great-circle interpolation. Altitude ramps via sine ease-in from 0 → target orbit altitude. Polar vs equatorial heading heuristic. Upcoming: solid colored polylines. Recent: dashed/faded polylines via PolylineDash material. Selection-aware: shows only selected launch's trajectory when one is picked, all trajectories otherwise.
- **Frontend — `store.ts`**: Added `recentLaunches`, `showRecentLaunches` state + setters. Implemented full filtering logic: provider, status, date range, search query.
- **Frontend — `DashboardLayout.tsx`**: Added dynamic imports for `LaunchPin` and `TrajectoryOverlay` (no SSR, like SatelliteLayer).
- **Architecture**: Backend fetches + caches from dual APIs → Frontend React Query fetches `/api/launches` and `/api/launches/recent` → mapping layer transforms to domain models → `LaunchPin` renders BillboardCollection on globe → `TrajectoryOverlay` renders PolylineCollection arcs → `LaunchList` table syncs selection with globe via GlobeStore → `LaunchDetail` shows countdown + info
- **Pre-existing TS errors**: Same scaffold stub errors remain (unused vars in Sidebar, Toast framer-motion, graphs, investments, weather) — zero new errors in 1C files

#### 1D. Satellite Growth Chart ✅ COMPLETE (2026-03-27)
- [x] Wire `useChartData` hook to backend `/api/satellites/growth`
- [x] Implement Recharts area chart in `SatelliteGrowthChart.tsx`
- [x] Add multi-select filters: orbit type (LEO/MEO/GEO/HEO), function, operator
- [x] Hover tooltips with exact counts
- [x] Export CSV/JSON button

**1D Implementation Notes:**
- **Backend — `routes/satellites.ts` (`/growth`)**: Expanded from 3 LEO-only constellations to 16 constellations across all 4 orbit types (LEO: Starlink, OneWeb, Iridium, Planet, Spire, Globalstar; MEO: GPS, GLONASS, Galileo, BeiDou; GEO: SES, Intelsat, Eutelsat; HEO: Molniya, Tundra, SiriusXM). Each entry has `orbitType`, `operator`, `function` metadata. Server-side aggregation sums active satellites per orbit type per year. Response includes `aggregated` (time-series for the chart), `constellations` (per-constellation detail), and `filterOptions` (available operators/functions for dropdowns). Supports query-string filters: `?orbitTypes=leo,meo&operators=SpaceX&functions=Internet`.
- **Frontend — `types.ts`**: Added `GrowthApiResponse`, `ConstellationGrowthEntry` interfaces. Extended `FilterOptions` with `operators` and `functions` arrays. Added `year` field to `SatelliteGrowthData`.
- **Frontend — `hooks/useChartData.ts`**: `useSatelliteGrowthData()` now fetches from `/api/satellites/growth` with query params built from filter state. Client-side `applyTimeRange()` trims data by `ChartTimeRange` using React Query `select` (single cache, multiple views). New `useGrowthFilterOptions()` hook (24hr staleTime) fetches available filter values for dropdowns.
- **Frontend — `SatelliteGrowthChart.tsx`**: Full Recharts `AreaChart` with 4 stacked orbit-type areas (LEO cyan, MEO green, GEO orange, HEO purple). Custom `GrowthTooltip` component shows per-orbit counts + total with color-coded legend squares. Gradient fills per orbit type. `visibleOrbits` computed from filter state so toggling orbit types hides/shows areas. Y-axis formatter (1k/2.5k), X-axis shows year only. Legend with orbit type labels. 800ms animation.
- **Frontend — `ChartFilters.tsx`**: Time range button row (1D/1W/1M/3M/1Y/ALL). Orbit type toggle pills with color dots. Reusable `MultiSelectDropdown` component for operator and function filters (checkbox list, outside-click close). Active filter pill strip with per-pill remove buttons + "Clear all" link. All state lifted to parent via callbacks.
- **Frontend — `ExportButton.tsx`**: Dropdown with CSV and JSON export options. `toCSV()` builds Year/LEO/MEO/GEO/HEO/Total header + rows. `downloadBlob()` triggers browser download via temporary `<a>` element. Disabled state when no data.
- **Frontend — `SatelliteGrowthPanel.tsx`**: Collapsible panel widget (bottom-right of globe, 420px wide). Composes chart + filters + export. Manages `timeRange` and `filters` state. Toggle collapse via header bar. Export button in header next to collapse chevron.
- **Frontend — `DashboardLayout.tsx`**: Added dynamic import for `SatelliteGrowthPanel` (no SSR). Renders after TrajectoryOverlay, before PluginRenderer.
- **Frontend — `index.ts`**: Added exports for `SatelliteGrowthPanel`, `ExportButton`, `useGrowthFilterOptions`.
- **Architecture**: Backend serves static historical growth data with server-side filter + aggregation → Frontend React Query fetches `/api/satellites/growth` with query params → `useSatelliteGrowthData` caches response, `select` applies client-side time-range trimming → `SatelliteGrowthChart` renders stacked Recharts areas → `ChartFilters` drives filter state → `ExportButton` downloads from cached data → `SatelliteGrowthPanel` composes all into a collapsible overlay
- **Pre-existing TS errors**: Same 11 scaffold stub errors remain (Sidebar, Toast, investments, weather, websocket, plugins) — zero new errors in 1D files

#### 1E. Backend Real-Time Pipeline ✅ COMPLETE (2026-03-27)
- [x] Implement real API calls in all service stubs (replace mock data)
- [x] Configure cache TTLs per data source
- [x] Wire polling jobs to broadcast via WebSocket
- [x] Implement change detection (only broadcast on actual data changes)
- [x] Connect frontend WebSocket client to backend namespaces

**1E Implementation Notes:**
- **Backend — `weather.service.ts`**: Full NOAA SWPC integration. Solar wind from `/products/solar-wind/plasma-7-day.json` (latest non-null entry, dynamic pressure calculation). Kp index from `/products/noaa-planetary-k-index.json`. X-ray flux from `/json/goes/primary/xrays-7-day.json` (dual-band: 0.05–0.4nm + 0.1–0.8nm, auto-classification A/B/C/M/X). Alerts from `/products/alerts.json` (parsed into type/severity from message content, supports solar flare, geomagnetic storm, radiation, CME classification). All endpoints have graceful fallback to mock data on API failure.
- **Backend — `spacex.service.ts`**: Completed with real SpaceX API v4 integration for launches (`/launches/upcoming` + `/launchpads` for coordinates) and Starlink constellation stats derived from Celestrak TLE counts. Note: `launches.service.ts` remains the primary dual-source launch aggregator (RocketLaunch.Live + SpaceX); this service provides SpaceX-specific extras.
- **Backend — `config/index.ts`**: Per-source cache TTLs: solar wind 2min, Kp index 3min, X-ray flux 2min, alerts 1min, launches 5min, TLE 1hr, constellations 24hr, investments 1hr. Tuned to match data volatility per source.
- **Backend — `pollLaunches.ts`**: Granular change detection using Map-based ID lookup. Emits `launches_created`, `launches_updated`, `launches_removed` events alongside full `launches_update` snapshot. First poll seeds state without diff.
- **Backend — `pollTle.ts`**: Granular change detection for `satellites_added`, `satellites_updated`, `satellites_removed`. Uses `satelliteId` for identity, JSON equality for update detection. Includes `pollConstellationTles()` for per-constellation polling.
- **Backend — `pollWeather.ts`**: Smart change detection comparing key numeric fields (speed delta >10 km/s, density delta >0.5, Kp integer change, flux class change or >50% ratio). Emits `weather_update`, `weather_alert`, plus significant events: `kp_index_significant_change` (±2 Kp with G-level), `solar_wind_surge` (+100 km/s), `xray_flux_escalation` (class escalation). Alert severity mapped from NOAA G1–G5/S1–S5/R1–R5 scales.
- **Backend — `websocket/handlers.ts`**: Room-based subscription tracking per socket. Clients join named rooms on subscribe (e.g., `launches`, `constellation:starlink`, `weather`, `alerts`). Socket cleanup on disconnect. Each namespace sends initial data snapshot on subscribe. New `subscribe_tle_updates` event for bulk TLE subscriptions.
- **Backend — `websocket/index.ts`**: Added WebSocket transport config (`['websocket', 'polling']`), ping interval/timeout tuning, FRONTEND_URL env support.
- **Frontend — `src/lib/api/websocket.ts`**: Extended with namespace socket manager. `getNamespaceSocket(namespace)` creates/reuses Socket.io namespace connections with shared reconnection config. `disconnectNamespace()` and `disconnectAll()` for cleanup. All namespace sockets share the same transport via Socket.io multiplexing.
- **Frontend — `useLaunchWebSocket.ts`**: Subscribes to `/launches` namespace. Listens for `launches_update`, `launches_created`, `launches_updated`, `launches_removed`. Invalidates React Query `['launches']` cache on any change, triggering automatic re-fetch.
- **Frontend — `useSatelliteWebSocket.ts`**: Subscribes to `/satellites` namespace via `subscribe_tle_updates`. Listens for `tle_update`, `satellites_added`, `satellites_updated`, `satellites_removed`. Also provides `useConstellationWebSocket(name)` for per-constellation subscriptions. Invalidates `['satellite-tle']` and `['constellations']` caches.
- **Frontend — `useWeatherWebSocket.ts`**: Subscribes to `/weather` namespace for both weather data and alerts. Listens for `weather_update`, `weather_alert`, `kp_index_significant_change`, `solar_wind_surge`, `xray_flux_escalation`. Supports optional `onAlert` and `onSignificantChange` callbacks for UI notifications. Invalidates all weather query caches.
- **Frontend — `useSpaceWeather.ts`**: Rewired from null stubs to real API calls. `useSpaceWeather()` fetches `/api/weather/solar-wind`, `/api/weather/kp-index`, `/api/weather/xray` with stale times matching backend cache TTLs. Added `useWeatherAlerts()` hook for `/api/weather/alerts`. Maps backend response fields to frontend types (kpIndex→value, longWave→flux_long, etc.).
- **Frontend — `RealtimeProvider.tsx`**: New provider component that activates all three WebSocket hooks (`useLaunchWebSocket`, `useSatelliteWebSocket`, `useWeatherWebSocket`). Mounted inside `Providers` (after QueryClientProvider) so WebSocket connections persist across the app. Calls `disconnectAll()` on unmount.
- **Frontend — `src/lib/providers.tsx`**: Added `RealtimeProvider` wrapping children inside `QueryClientProvider`.
- **Frontend — barrel exports**: Updated `launches/index.ts`, `satellites/index.ts`, `weather/index.ts` to export new WebSocket hooks and `useWeatherAlerts`.
- **Investments note**: `investments.service.ts` remains mock — no free API exists for space investment data (Crunchbase/PitchBook require paid keys). This is by design per the "free APIs only" constraint. Mock data preserved with fallback pattern.
- **Verified**: Backend starts clean (Redis fallback to in-memory), all weather endpoints return live NOAA data (solar wind 396 km/s, Kp=1 quiet, X-ray C-class, real alerts). Launch endpoint returns live RocketLaunch.Live data. Zero new TypeScript errors in both frontend and backend.
- **Architecture**: Backend polling jobs (cron) → fetch from real APIs → cache with per-source TTLs → detect changes via field-level comparison → broadcast granular WebSocket events to namespace rooms → Frontend WebSocket hooks listen → invalidate React Query cache → components auto-re-fetch fresh data

### Phase 2 — Enhanced Features (Target: +4 weeks)

#### 2A. Space Weather Panel + At-Risk Satellites ✅ COMPLETE (2026-03-27)
- [x] Space weather widget with Kp-index, X-ray flux indicators
- [x] At-risk satellite list triggered by dangerous weather

**2A Implementation Notes:**
- **Frontend — `SpaceWeatherPanel.tsx`**: Full dashboard panel for the right column with three metric rows: Solar Wind (speed in km/s, density, temperature, color-coded severity, trend arrows), Kp Index (0–9 bar with storm threshold marker at Kp=5, G-level label, severity badge), X-ray Flux (A/B/C/M/X flare class bar, dual-band flux values, class badge). Alert summary section shows count + first 3 alert descriptions. Header shows pulsing "STORM" badge when conditions are dangerous. Danger threshold: Kp ≥ 5 OR X-ray ≥ M-class. Exported `isDangerousWeather()` utility for reuse.
- **Frontend — `AtRiskSatellites.tsx`**: Panel below SpaceWeatherPanel showing constellations at risk during dangerous space weather. Quiet state shows green "All Clear" with monitoring thresholds. Danger state shows trigger banner (Kp level + G-scale, flare class), then a sorted list of constellations with risk level badges (CRITICAL/HIGH/MODERATE). Each row is expandable to show orbit altitude, operator, specific risk factors, and estimated impact. Critical rows auto-expand and pulse. Summary footer shows total constellation and satellite counts.
- **Frontend — `useAtRiskSatellites.ts`**: Hook that combines `useSpaceWeather()` + `useConstellationData()` to assess risk per constellation. Covers all orbit types: LEO (atmospheric drag, radiation), MEO (radiation belt expansion, SAA growth), GEO (surface charging, hot plasma injection), HEO (dual belt transit, apogee exposure). Risk levels assigned based on Kp value × flare class × orbit type matrix. Returns `AtRiskSummary` with trigger reasons, sorted constellation list, and total satellite count.
- **Frontend — `DashboardLayout.tsx`**: Right column now has 3 resizable panels: Satellite Growth (40%) + Space Weather (30%) + At-Risk Satellites (30%), with vertical ResizeHandles between them. Dynamic imports for both new panels (no SSR).
- **Frontend — `weather/index.ts`**: Added exports for `SpaceWeatherPanel`, `AtRiskSatellites`, `useAtRiskSatellites`.
- **Architecture**: `useSpaceWeather()` fetches live NOAA data via React Query → `SpaceWeatherPanel` renders metrics with severity colors/bars → `isDangerousWeather()` checks Kp≥5 or M/X flare → `useAtRiskSatellites()` cross-references weather with constellation data → `AtRiskSatellites` renders sorted risk list with expandable details
- **Pre-existing TS errors**: Same scaffold stub errors remain — zero new errors in 2A files

#### 2B. Bloomberg Layout + Satellite Popup + Upcoming Launches ✅ COMPLETE (2026-03-27)
- [x] Bloomberg-style draggable/resizable panel layout (react-grid-layout)
- [x] Satellite detail popup with orbit path visualization on node click
- [x] Upcoming launches panel with countdown timers

**2B Implementation Notes:**
- **Frontend — `BloombergLayout.tsx`**: New generic Bloomberg-style panel layout component using `react-grid-layout` (Responsive + WidthProvider). Panels are freely draggable via title bar handles and resizable from edges. Each panel has chrome with title, icon, maximize/minimize/close buttons. Maximized state saves and restores previous layout. Closed panels appear in a restore bar at the top. "Reset layout" button returns to defaults. Grid uses vertical compaction, 4px margins, CSS transforms for smooth animation. Drag handle class `.bloomberg-drag-handle` restricts drag to title bar only.
- **Frontend — `SatelliteDetailPopup.tsx`**: Floating popup that activates when clicking a satellite on the globe. Reads `selectedGlobeEntity` from GlobeStore (type === 'satellite'). Shows: animated SVG orbit path visualization (Earth with atmosphere, dashed orbit ellipse, moving satellite dot, inclination tilt), key metrics grid (altitude, velocity, heading, footprint), orbit type badge (LEO/MEO/GEO/HEO with color), constellation metadata (operator, function, total satellites, website) resolved from `useConstellationData()`. Expandable "More Details" section. Positioned center-screen with zoom-in animation.
- **Frontend — `UpcomingLaunchesPanel.tsx`**: Panel showing next 3 upcoming launches sorted by scheduledTime, expandable to show all. Each `LaunchCard` has: rank badge, rocket type + status badge, mission name, live countdown timer (T- / T+, updating every second via `useCountdown` hook), imminent launch highlighting (<24h, pulsing cyan). Expanded view shows: operator, launch site, payload name/orbit, mass, mission type, scheduled datetime, probability bar, "View on Globe" flyTo button, webcast link. "Show More" button reveals additional launches.
- **Frontend — `DashboardLayout.tsx`**: Replaced static `react-resizable-panels` right column with `BloombergLayout` grid. Globe stays in fixed left panel (65% default), right column (35%) contains 4 draggable panels: Satellite Growth (full-width top), Space Weather + Upcoming Launches (side-by-side middle), At-Risk Satellites (full-width bottom). Added `SatelliteDetailPopup` as floating overlay. Removed old `DetailPanel` from satellite flow (popup handles it).
- **Frontend — `globals.css`**: Added Bloomberg grid styles: placeholder with dashed cyan border, resize handles with corner indicators, `.bloomberg-panel` full-height, `.animate-in` zoom-in animation for popup.
- **Dependencies**: Added `react-grid-layout` + `@types/react-grid-layout`.
- **Barrel exports updated**: `satellites/index.ts` (SatelliteDetailPopup), `launches/index.ts` (UpcomingLaunchesPanel).
- **Architecture**: Globe panel (left) stays fixed with `react-resizable-panels` divider → Right column uses `react-grid-layout` Responsive grid → Panels freely moveable/resizable within grid → Satellite clicks on PointPrimitiveCollection → GlobeStore.selectedGlobeEntity → SatelliteDetailPopup reads entity + constellation data → Launches panel uses React Query + live countdown hooks
- **Pre-existing TS errors**: Same 9 scaffold stub errors remain — zero new errors in 2B files

#### Remaining Phase 2 tasks:
- [ ] Constellation grouping with interactive filters
- [ ] Space weather overlay on globe (solar wind visualization)
- [ ] Investment activity feed as timeline bubbles
- [ ] Toast notifications for launches and solar events

### Phase 3 — Polish & Scale

- [ ] User accounts and authentication
- [ ] Configurable alert system (browser push, Discord/Telegram webhooks)
- [ ] Data export (CSV/JSON) for all modules
- [ ] Plugin marketplace (registerFeature pattern is ready)
- [ ] Mobile/tablet responsive layout (2D fallback)
- [ ] Accessibility: ARIA labels, keyboard nav, high-contrast mode
- [ ] Internationalization (i18n-ready strings)
- [ ] CI/CD pipeline
- [ ] Sentry performance monitoring (FPS tracking)

---

## API Endpoints Reference

### Launches (`/api/launches`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | All upcoming launches |
| GET | `/:id` | Launch by ID |
| GET | `/recent` | Recent launches |
| GET | `/summary` | Dashboard summary stats |

### Satellites (`/api/satellites`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/tle` | TLE data (all or filtered) |
| GET | `/constellations` | All constellations |
| GET | `/constellations/:name` | Constellation details |
| GET | `/growth` | Satellite growth over time |
| GET | `/:id/position` | Current satellite position |

### Space Weather (`/api/weather`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/solar-wind` | Real-time solar wind |
| GET | `/kp-index` | Geomagnetic activity |
| GET | `/xray` | X-ray flux |
| GET | `/current` | Combined weather snapshot |
| GET | `/alerts` | Active weather alerts |

### Investments (`/api/investments`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/funding` | Recent funding rounds |
| GET | `/events` | Investment events |
| GET | `/companies/:name` | Company profile |
| GET | `/trends` | Funding trends |

### WebSocket Namespaces
- `/launches` — Events: `subscribe_launches`, `launches_update`
- `/satellites` — Events: `subscribe_satellite`, `subscribe_constellation`, `satellite_position`
- `/weather` — Events: `subscribe_weather`, `subscribe_alerts`, `weather_update`, `weather_alert`

---

## External Data Sources (Free Only)

| Source | URL | Data | Refresh |
|--------|-----|------|---------|
| Celestrak | `https://celestrak.org` | TLE orbital data | 30 min |
| SpaceX API v5 | `https://api.spacexdata.com/v5/launches/latest` | Launches + Starlink | 60s |
| NOAA SWPC | `https://services.swpc.noaa.gov` | Solar wind, Kp, X-ray | 60s |
| RocketLaunch.Live | `https://fdo.rocketlaunch.live` | Launch schedule | 60s |

---

## Quick Start

```bash
# Frontend
cd spacepulse && npm install && cp .env.example .env.local && npm run dev

# Backend (separate terminal)
cd spacepulse/server && npm install && cp .env.example .env && npm run dev
```

Frontend: http://localhost:3000 | Backend API: http://localhost:3001/api | WebSocket: ws://localhost:3001

---

## Non-Goals (Out of Scope for Now)
- Paid API integrations
- Database/ORM (all data is API-fetched + cached)
- User authentication (Phase 3)
- Mobile-first design (desktop-first, mobile degrades gracefully)
- Lunar/deep-space missions (Phase 3+)
