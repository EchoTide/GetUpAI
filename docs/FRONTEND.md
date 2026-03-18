# Frontend

## Main rule

For desktop UI work, optimize first for `clients/desktop/src/pages/DashboardPage.tsx` unless the task explicitly targets another screen.

## Dashboard layout constraints

These constraints are important and should be preserved during layout changes:

- The main desktop visual hierarchy is: top bar -> hero ring -> primary action -> supporting stats
- The primary CTA must not be obscured by expanded stats content
- “More data” is intended to be visible by default on desktop
- The desktop page should avoid page-level scrollbar regressions in normal app window sizes
- Large empty dead zones are also regressions; the main layout should use space intentionally
- Top bar chrome should stay visually light and should not reintroduce stray borders, red lines, or duplicated status widgets

## Responsive rules

- The outer container must respond to both width and height, not width alone
- Desktop layout should account for shorter window heights, not only wide windows
- If a fix depends on scrolling, first ask whether the layout should adapt instead
- Prefer explicit layout states over accidental behavior from `overflow: hidden` or `flex` defaults

## Component responsibilities

- `DashboardPage.tsx`: decides page layout and section spacing
- `StatsDrawer.tsx`: disclosure behavior only; it should not silently take over page layout responsibilities
- `StatTile.tsx` and `AchievementCard.tsx`: compact stat presentation

## UI change checklist

Before finishing UI work, confirm:

- no overlap between expanded sections and CTA
- no half-cut buttons or cards
- no large unexplained blank zones
- no duplicated controls in top bar
- desktop and compact states both still make sense

## Testing expectations for UI work

- Add or update a focused Vitest regression near the page/component
- Run the changed test first
- Run relevant broader desktop regression tests before finishing
- Use Playwright when the issue depends on actual rendered layout or window size behavior
