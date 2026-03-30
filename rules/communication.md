# Communication Rules

## General
- Be clear, structured, and use markdown.
- Always confirm loaded rules at the start of complex tasks.
- Ask targeted, minimal questions when clarification is needed.
- End responses with next steps or a clear status against the contract.

## SpacePulse Communication Standards

### When Reporting Progress
- Reference the active contract (`contracts/ACTIVE_TASK.md`) and state which checklist items are affected.
- After completing any implementation work, update the contract's checklist (mark items done, add new items discovered).

### When Proposing Changes
- If a change touches multiple feature modules, list every file that will be modified before starting.
- If a change affects the plugin system or shared infrastructure (`src/lib/`), flag it — these are high-impact areas.

### When Documenting APIs
- Backend endpoints are documented in `contracts/ACTIVE_TASK.md` under "API Endpoints Reference." Update it when adding/changing routes.
- WebSocket events are documented in the same section under "WebSocket Namespaces." Keep this in sync.

### Naming Conventions
- Feature folders: lowercase singular (`globe`, `weather`, not `Globe` or `weathers`)
- Components: PascalCase (`GlobeContainer.tsx`)
- Hooks: camelCase with `use` prefix (`useGlobeViewer.ts`)
- Store files: `store.ts` (one per feature)
- Type files: `types.ts` (one per feature)
- Services: `<name>.service.ts` (backend)
