# Architecture

## Monorepo shape

This repository has two Node packages:

- `clients/desktop`: desktop application built with Electron, React, TypeScript, and Vite
- `shared-logic`: framework-agnostic business logic package intended for reusable domain behavior

Use `clients/desktop` for UI, Electron integration, page composition, and app-local state wiring. Use `shared-logic` for pure business rules that should not depend on React, Electron, or browser APIs.

## Desktop app structure

Important areas inside `clients/desktop/src`:

- `pages/`: top-level screens
  - `DashboardPage.tsx`: main app surface and highest-priority UI
  - `PopupPage.tsx`: forced reminder / standing flow
- `components/`: reusable UI pieces such as `StatsDrawer`, `StatTile`, `DataModal`, `ShareModal`
- `store/`: Zustand stores
  - `useAppStore.ts`: timer state, reminder loop, daily stats, pause/DND/rest logic, achievements
- `utils/`: formatting, achievements, reminder strategy, exercise selection
- `ai/`: prompt builders and AI interaction helpers

## Ownership boundaries

- `DashboardPage.tsx` owns the main dashboard layout, top bar, hero ring, primary CTA, and desktop/mobile layout adaptations
- `PopupPage.tsx` owns interruption UX and standing-session flow
- `useAppStore.ts` is the behavioral source of truth for sitting / standing / paused state transitions
- `StatsDrawer.tsx` is a reusable disclosure container; page-level layout policy belongs in the page, not inside the drawer

## State model

Core app modes in `useAppStore.ts`:

- `sitting`
- `standing`
- `standing_work`
- `paused`

`useAppStore.ts` also owns:

- reminder timing
- DND and rest windows
- idle/lock pause behavior
- daily aggregates and logs
- standing work tracking
- AI insight history

If a UI change appears to require business-rule changes, inspect `useAppStore.ts` first before patching page code.

## Decision rules

- Put visual composition and layout in pages/components
- Put reusable, pure rules in `shared-logic` or `utils`
- Keep app state transitions centralized instead of duplicating logic in multiple screens
- Prefer adding test IDs and explicit layout invariants rather than relying on fragile visual assumptions
