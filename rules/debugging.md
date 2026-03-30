# Debugging Rules

## General
- First explore and report observations neutrally ("This is how the code currently behaves...").
- Only after neutral analysis may you suggest fixes.
- Never invent bugs to satisfy a request.
- Use adversarial thinking only when I specifically ask for it.

## SpacePulse Debugging Tools

### Frontend
- **Debug Overlay**: Toggle via `src/components/ui/DebugOverlay.tsx` — shows FPS, entity count, data latency, memory usage. Use this first when diagnosing performance issues.
- **React Query Devtools**: Available in dev mode for inspecting cache state, stale queries, and refetch behavior.
- **Zustand Devtools**: Middleware is configured in the root store for state inspection.
- **Cesium Inspector**: Cesium's built-in inspector can be enabled for entity/primitive debugging.
- **Browser DevTools**: WebSocket frames visible in Network tab (filter by WS).

### Backend
- All services log to console with `[ServiceName]` prefix. Check server terminal output.
- Job scheduler logs job registration and execution status.
- Error handler middleware (`server/src/middleware/errorHandler.ts`) returns structured errors with stack traces in dev mode.
- Cache hits/misses are logged by the cache abstraction.

### Common Issues to Watch For
- **Cesium token**: Missing `NEXT_PUBLIC_CESIUM_ION_TOKEN` in `.env.local` will cause globe to fail silently.
- **CORS**: Backend CORS is wide-open in dev. If you see CORS errors, check that the backend is running on port 3001.
- **TLE parsing**: Celestrak TLE format is strict (3 lines per entry). Off-by-one in parsing breaks SGP4.
- **WebSocket reconnection**: Socket.io client has auto-reconnect, but namespace subscriptions need re-registration after reconnect.
- **Memory leaks**: Cesium entities must be cleaned up when components unmount. Check for missing `viewer.entities.removeAll()` in cleanup.
