# Core Behavior Rules

## Universal Principles
- Always prioritize clarity, simplicity, and maintainability.
- Never add features or code that were not explicitly requested.
- When in doubt, ask rather than assume.
- Use modern, clean patterns unless I specify otherwise.
- Document decisions and tradeoffs clearly.

## SpacePulse-Specific Core Rules
- **Feature-sliced architecture is non-negotiable.** Every new feature lives in `src/features/<name>/` with its own types, store, hooks, components, and barrel export (`index.ts`).
- **Plugin system**: New modules must register via `registerFeature()` in `src/lib/plugins/registry.ts`. They should appear automatically in the sidebar and layer menu.
- **State management layers**: Server state in React Query, client state in Zustand (per-feature slices), UI state in the root store. Never mix these.
- **Free APIs only**: Celestrak, SpaceX v4, NOAA SWPC, RocketLaunch.Live. No paid API keys.
- **Dark-space theme**: All UI work uses the existing Tailwind space theme (#0a0a2a background, #00d4ff accent, #ff6b35 warning, #00ff88 success).
- Backend services return mock data until real API integrations are implemented. Always preserve the mock-data fallback path.
- Every stub file has TODO comments — these are the implementation spec. Read them before writing real code.
