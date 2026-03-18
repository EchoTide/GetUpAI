# AGENTS.md

Agent entry point for `H:\project\GetUpAI`.

This file is a map, not the full manual. Start here, then read the linked docs before changing code.

## What this product does

GetUpAI is a desktop app that helps users avoid prolonged sitting by tracking sitting time, triggering reminders, and guiding standing or standing-work sessions.

The main user surface is `DashboardPage`. `PopupPage` is a secondary intervention surface for reminder/standing flow, not the primary dashboard.

## Repo shape

- `clients/desktop`: Electron + React + TypeScript app
- `shared-logic`: shared TypeScript business logic package
- `docs/`: repository knowledge base and operating rules
- `scripts/`: repo utility scripts

## First reads

Read these in order for most tasks:

1. `docs/README.md`
2. `docs/ARCHITECTURE.md`
3. `docs/PRODUCT.md`
4. `docs/FRONTEND.md` for UI work
5. `docs/TESTING.md` before verification

## Core commands

From `clients/desktop`:

- Install: `npm install`
- Dev renderer: `npm run dev`
- Dev Electron: `npm run electron:dev`
- Tests: `npm run test`
- Single test: `npx vitest run src/pages/DashboardPage.test.tsx`
- Playwright: `npx playwright test`

From `shared-logic`:

- Install: `npm install`
- Build: `npm run build`

From repo root:

- i18n parity: `node scripts/check-i18n-parity.js`

## Working rules

- Prefer minimal, scoped changes
- Do not add dependencies unless necessary
- Keep reusable business rules in `shared-logic` when possible
- Do not treat `PopupPage` as the main dashboard; `DashboardPage` is the main desktop surface
- For bug fixes and behavior changes, add or update focused tests near the changed logic
- Read nearby files before changing patterns

## Where to look

- Main dashboard UI: `clients/desktop/src/pages/DashboardPage.tsx`
- Reminder popup UI: `clients/desktop/src/pages/PopupPage.tsx`
- App state and timer logic: `clients/desktop/src/store/useAppStore.ts`
- Shared logic package: `shared-logic`

If this file and deeper docs disagree, update the docs so the repository stays the source of truth.
