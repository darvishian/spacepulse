# Testing Rules

## General
- Every implementation must include tests that prove the contract is satisfied.
- Tests must be deterministic and cover happy path + edge cases.
- I will review tests before you run them — do not edit them yourself.
- Task is not complete until all tests pass and contract verification is done.

## SpacePulse Testing Strategy

### Unit Tests
- Each feature module should have tests for its hooks, store actions, and utility functions.
- Use Vitest (or Jest) for unit tests. Test files live alongside source: `*.test.ts` / `*.test.tsx`.
- Mock external dependencies (API calls, WebSocket, Cesium viewer).

### Component Tests (Storybook)
- Every UI component in `src/components/ui/` and each feature's main component should have a Storybook story.
- Stories live in `*.stories.tsx` files next to the component.
- Storybook config is ready: `npm run storybook` (port 6006).

### E2E Tests (Playwright)
- Playwright is configured: `npm run test`.
- E2E tests cover critical user flows: globe loads, satellite data appears, launch list renders, chart filters work.
- Test files go in a top-level `tests/` or `e2e/` directory.

### Backend Tests
- Service functions should have unit tests with mocked API responses.
- Route handlers should have integration tests using supertest.
- WebSocket handlers should have tests verifying event emission.

### What to Test First (Priority Order)
1. SGP4 propagation accuracy (satellite.js integration)
2. TLE data parsing and normalization
3. Launch data normalization from multiple APIs
4. Zustand store actions and state transitions
5. Chart data aggregation logic
6. WebSocket reconnection behavior
