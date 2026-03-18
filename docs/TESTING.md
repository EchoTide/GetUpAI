# Testing

## Default rule

When behavior changes, run the smallest relevant test first, then widen verification.

## Desktop unit/component tests

From `clients/desktop`:

- All Vitest tests: `npm run test`
- Single file:
  - `npx vitest run src/pages/DashboardPage.test.tsx`
  - `npx vitest run src/pages/PopupPage.test.tsx`
  - `npx vitest run src/store/useAppStore.test.ts`
  - `npx vitest run src/components/ShareCard.test.tsx`
- Single test name:
  - `npx vitest run -t "Smoke Test"`

## Playwright

From `clients/desktop`:

- All Playwright tests: `npx playwright test`
- Existing focused specs:
  - `npx playwright test tests/window-dragging.spec.ts`
  - `npx playwright test tests/popup_regression.spec.ts`
  - `npx playwright test tests/sync-status.spec.ts`
  - `npx playwright test tests/offline-mode.spec.ts`

## Type checks

From repo root:

- Desktop: `npx tsc -p clients/desktop/tsconfig.json --noEmit`
- Shared: `npx tsc -p shared-logic/tsconfig.json --noEmit`

## i18n and repo checks

From repo root:

- `node scripts/check-i18n-parity.js`

## What to run by change type

### Dashboard layout changes

- `npx vitest run src/pages/DashboardPage.test.tsx`
- If layout/viewport behavior changed, run relevant Playwright coverage too
- If store behavior changed as part of the fix, also run `npx vitest run src/store/useAppStore.test.ts`

### Popup behavior changes

- `npx vitest run src/pages/PopupPage.test.tsx`
- `npx playwright test tests/popup_regression.spec.ts`

### Shared logic changes

- `npm run build` in `shared-logic`
- related desktop tests if the desktop app consumes the changed logic

## Verification standard

- Do not claim a fix works without actually running relevant verification
- Prefer evidence from targeted tests over broad guessing
- If you cannot run a meaningful verification step, say exactly what remains unverified
