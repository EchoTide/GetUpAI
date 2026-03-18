# Product

## Core product loop

GetUpAI is a desktop app that pushes users to break up long sitting sessions and complete standing intervals.

The default loop is:

1. User is in `sitting` mode
2. Countdown moves toward the next reminder
3. Reminder triggers popup / intervention flow
4. User stands, pauses, ignores, or gives an excuse
5. Daily stats, logs, and achievements update

This loop matters more than secondary surfaces.

## Primary surfaces

Priority order for product surfaces:

1. `DashboardPage`: main daily control center
2. `PopupPage`: interruption and compliance flow
3. settings, sharing, data, and achievements modals

If there is a conflict between a secondary surface and the dashboard experience, treat the dashboard as the higher-priority UX unless product behavior would break.

## Dashboard intent

The desktop dashboard should feel focused, not cluttered.

Key expectations:

- One dominant visual center: the countdown ring
- Primary CTA must remain obvious and usable
- Top bar should stay light and utility-oriented
- “More data” should be useful by default, not hidden behind needless friction
- Stats should support the core loop, not compete with it

## Popup intent

The popup is a behavior-change moment. It can be more forceful than the dashboard.

It should:

- make the standing requirement obvious
- keep the action path clear
- support excuses, pauses, and standing work where product rules allow

## What not to forget

- Dashboard is the main desktop page; do not confuse it with popup work
- UI work must preserve timer and mode behavior owned by `useAppStore.ts`
- Daily stats shown in UI should align with store-backed values, not ad-hoc calculations when avoidable
