# GetUpAI Agent-First Harness Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Turn `GetUpAI` into an agent-friendly repository where coding agents can reliably understand product intent, navigate architecture, run focused verification, reproduce UI bugs, and ship changes with less human back-and-forth.

**Architecture:** Keep `AGENTS.md` short and make the repository itself the system of record. Add a structured `docs/` knowledge base, explicit quality rules, a lightweight executable plan workflow, and repo-local verification entry points. Improve agent legibility first for the Electron desktop app, then tighten feedback loops with UI validation and recurring cleanup.

**Tech Stack:** TypeScript, React, Electron, Vite, Vitest, Playwright, Zustand, Markdown docs, Node scripts.

---

## Why this plan exists

Right now, `GetUpAI` already has some useful agent affordances:

- A repo-level `AGENTS.md`
- Clear package split between `clients/desktop` and `shared-logic`
- Existing unit tests and Playwright support
- A stable command surface in `package.json`

But the repo is still human-first in a few important ways:

- Product and UI intent are not organized as a repository knowledge base
- There is no short “map” plus deeper docs model
- There is no first-class plan directory for larger tasks
- Quality rules are mostly implicit rather than codified
- There is no single agent-facing verification entry point for common work
- UI regression workflows rely on manual context gathering

This plan fixes that by creating a minimal but real harness layer around the existing project, without adding unnecessary infrastructure or dependencies.

## Target repository shape

At the end of this plan, the repo should roughly look like this:

```text
AGENTS.md
ARCHITECTURE.md
docs/
  README.md
  design-docs/
    index.md
    desktop-dashboard.md
  product-specs/
    index.md
    core-loop.md
  exec-plans/
    README.md
    active/
    completed/
    tech-debt-tracker.md
  references/
    testing-workflows.md
    release-workflows.md
  FRONTEND.md
  QUALITY_SCORE.md
  RELIABILITY.md
scripts/
  check-i18n-parity.js
  check-doc-links.js
  check-plan-folders.js
  quality-score-report.js
```

The exact file count can stay small. The key is stable structure and discoverability.

## Ground rules for implementation

- Keep `AGENTS.md` concise and navigational
- Prefer repo-local markdown over external docs
- Do not add third-party dependencies unless absolutely necessary
- Use TDD for scripts and behavior changes
- Make every new rule either testable, script-checkable, or both
- Favor boring, legible conventions over clever abstractions

---

### Task 1: Create the repository knowledge base skeleton

**Files:**
- Create: `docs/README.md`
- Create: `docs/design-docs/index.md`
- Create: `docs/product-specs/index.md`
- Create: `docs/exec-plans/README.md`
- Create: `docs/exec-plans/active/.gitkeep`
- Create: `docs/exec-plans/completed/.gitkeep`
- Create: `docs/exec-plans/tech-debt-tracker.md`
- Create: `docs/references/testing-workflows.md`
- Create: `docs/references/release-workflows.md`

**Step 1: Write the failing test**

Create `clients/desktop/src/tests/repoDocs.test.ts` with a filesystem-based test that asserts the required docs and directories exist.

```ts
import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('repository docs skeleton', () => {
  it('contains the expected knowledge-base entry points', () => {
    expect(existsSync('../../docs/README.md')).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/tests/repoDocs.test.ts`

Expected: FAIL because `docs/README.md` and related files do not exist yet.

**Step 3: Write minimal implementation**

Create the `docs/` skeleton with short, high-signal markdown files:

- `docs/README.md`: explain the docs layout and what belongs where
- `docs/design-docs/index.md`: list design docs and validation status
- `docs/product-specs/index.md`: list user-facing behavior specs
- `docs/exec-plans/README.md`: explain `active/` vs `completed/`
- `docs/exec-plans/tech-debt-tracker.md`: list known debt with severity and owner field
- `docs/references/testing-workflows.md`: document Vitest and Playwright commands already supported
- `docs/references/release-workflows.md`: document `dist`, `dist:win`, `dist:mac`, `dist:linux`

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/tests/repoDocs.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add docs clients/desktop/src/tests/repoDocs.test.ts
git commit -m "docs: add agent-facing repository knowledge base"
```

---

### Task 2: Shrink `AGENTS.md` into a real navigation map

**Files:**
- Modify: `AGENTS.md`
- Create: `ARCHITECTURE.md`
- Create: `docs/FRONTEND.md`
- Create: `docs/RELIABILITY.md`

**Step 1: Write the failing test**

Extend `clients/desktop/src/tests/repoDocs.test.ts` to assert:

- `AGENTS.md` stays under a reasonable line budget
- `ARCHITECTURE.md` exists
- `docs/FRONTEND.md` exists
- `docs/RELIABILITY.md` exists

Example assertion:

```ts
expect(readFileSync('../../AGENTS.md', 'utf8').split('\n').length).toBeLessThanOrEqual(140);
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/tests/repoDocs.test.ts`

Expected: FAIL because the new docs do not exist and `AGENTS.md` is too long.

**Step 3: Write minimal implementation**

Refactor `AGENTS.md` so it becomes a short map with:

- Repo scope
- Install/test/build commands
- Rules for touching `clients/desktop` vs `shared-logic`
- Pointers to deeper docs:
  - `ARCHITECTURE.md`
  - `docs/FRONTEND.md`
  - `docs/RELIABILITY.md`
  - `docs/exec-plans/README.md`

Create:

- `ARCHITECTURE.md`: domain boundaries, desktop vs shared logic, stores, page/component responsibilities
- `docs/FRONTEND.md`: dashboard/popup/settings UI principles and responsive rules
- `docs/RELIABILITY.md`: what to verify before merging, how to treat flaky behavior, minimum regression expectations

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/tests/repoDocs.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add AGENTS.md ARCHITECTURE.md docs clients/desktop/src/tests/repoDocs.test.ts
git commit -m "docs: turn AGENTS into a navigational map"
```

---

### Task 3: Write the first product and design specs agents can actually use

**Files:**
- Create: `docs/product-specs/core-loop.md`
- Create: `docs/design-docs/desktop-dashboard.md`
- Modify: `docs/product-specs/index.md`
- Modify: `docs/design-docs/index.md`

**Step 1: Write the failing test**

Extend `clients/desktop/src/tests/repoDocs.test.ts` to assert these files exist and contain key headings:

- `# Core Loop`
- `# Desktop Dashboard`
- `## Acceptance Criteria`

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/tests/repoDocs.test.ts`

Expected: FAIL because the specs do not exist yet.

**Step 3: Write minimal implementation**

Create `docs/product-specs/core-loop.md` describing:

- Sitting timer lifecycle
- Reminder trigger behavior
- Standing punishment behavior
- Pause / DND / rest behavior
- Daily metrics definitions
- Acceptance criteria for each state transition

Create `docs/design-docs/desktop-dashboard.md` describing:

- The desktop page layout contract
- Primary CTA visibility requirements
- “More data” default-open rules
- No outer-page scrollbar requirement on standard desktop windows
- Topbar density and visual hierarchy requirements
- Regression checklist for layout work

Update both index files to link these docs.

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/tests/repoDocs.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add docs clients/desktop/src/tests/repoDocs.test.ts
git commit -m "docs: add core product and dashboard specs"
```

---

### Task 4: Add a repo-local quality score and drift tracker

**Files:**
- Create: `docs/QUALITY_SCORE.md`
- Create: `scripts/quality-score-report.js`
- Create: `clients/desktop/src/tests/qualityScoreScript.test.ts`

**Step 1: Write the failing test**

Create `clients/desktop/src/tests/qualityScoreScript.test.ts` to assert the script exits successfully and prints expected section names.

Example:

```ts
import { execFileSync } from 'node:child_process';
import { expect, it } from 'vitest';

it('prints quality score sections', () => {
  const output = execFileSync('node', ['../../scripts/quality-score-report.js'], { encoding: 'utf8' });
  expect(output).toContain('Documentation');
  expect(output).toContain('Testing');
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/tests/qualityScoreScript.test.ts`

Expected: FAIL because the script does not exist.

**Step 3: Write minimal implementation**

Create `docs/QUALITY_SCORE.md` with scored sections such as:

- Documentation
- Architecture clarity
- Testability
- UI regression safety
- Release confidence

Create `scripts/quality-score-report.js` that:

- Reads `docs/QUALITY_SCORE.md`
- Verifies section headings exist
- Prints a compact summary report to stdout
- Exits non-zero if the file is malformed

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/tests/qualityScoreScript.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add docs/QUALITY_SCORE.md scripts/quality-score-report.js clients/desktop/src/tests/qualityScoreScript.test.ts
git commit -m "tooling: add repository quality score report"
```

---

### Task 5: Add mechanical checks for doc structure and link integrity

**Files:**
- Create: `scripts/check-doc-links.js`
- Create: `scripts/check-plan-folders.js`
- Create: `clients/desktop/src/tests/repoScripts.test.ts`

**Step 1: Write the failing test**

Create `clients/desktop/src/tests/repoScripts.test.ts` to execute both scripts and assert zero exit status.

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/tests/repoScripts.test.ts`

Expected: FAIL because the scripts do not exist.

**Step 3: Write minimal implementation**

Create:

- `scripts/check-doc-links.js`
  - Walk `docs/**/*.md`
  - Validate relative markdown links resolve
  - Exit non-zero on broken links

- `scripts/check-plan-folders.js`
  - Verify `docs/exec-plans/active` and `docs/exec-plans/completed` exist
  - Verify each plan file begins with the required plan header pattern

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/tests/repoScripts.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add scripts clients/desktop/src/tests/repoScripts.test.ts
git commit -m "tooling: add docs and plan validation scripts"
```

---

### Task 6: Expose one agent-facing verification workflow from the repo root

**Files:**
- Modify: `clients/desktop/package.json`
- Modify: `shared-logic/package.json`
- Create: `package.json`
- Create: `scripts/verify-changed-area.js`
- Create: `clients/desktop/src/tests/verifyWorkflow.test.ts`

**Step 1: Write the failing test**

Create `clients/desktop/src/tests/verifyWorkflow.test.ts` that runs `node ../../scripts/verify-changed-area.js desktop-dashboard` and expects a known command list in stdout.

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/tests/verifyWorkflow.test.ts`

Expected: FAIL because the script and root package file do not exist.

**Step 3: Write minimal implementation**

Create a repo-root `package.json` with only narrow scripts, for example:

```json
{
  "private": true,
  "scripts": {
    "verify:desktop": "npm --prefix clients/desktop run test",
    "typecheck:desktop": "npx tsc -p clients/desktop/tsconfig.json --noEmit",
    "typecheck:shared": "npx tsc -p shared-logic/tsconfig.json --noEmit",
    "check:docs": "node scripts/check-doc-links.js && node scripts/check-plan-folders.js",
    "quality:report": "node scripts/quality-score-report.js"
  }
}
```

Create `scripts/verify-changed-area.js` that prints recommended verification commands for areas like:

- `desktop-dashboard`
- `desktop-popup`
- `shared-logic`
- `i18n`

The first version can print commands only; it does not need to execute them.

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/tests/verifyWorkflow.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add package.json scripts/verify-changed-area.js clients/desktop/src/tests/verifyWorkflow.test.ts clients/desktop/package.json shared-logic/package.json
git commit -m "tooling: add agent-facing verification entry points"
```

---

### Task 7: Make dashboard UI intent mechanically legible to agents

**Files:**
- Modify: `clients/desktop/src/pages/DashboardPage.test.tsx`
- Modify: `docs/design-docs/desktop-dashboard.md`
- Create: `clients/desktop/tests/dashboard-layout.spec.ts`

**Step 1: Write the failing test**

Add one Playwright spec `clients/desktop/tests/dashboard-layout.spec.ts` that checks a standard desktop viewport and verifies:

- primary CTA is visible
- more-data section is visible by default
- no page-level vertical scrollbar appears in the main dashboard viewport
- action row is visible without scrolling

**Step 2: Run test to verify it fails**

Run: `npx playwright test tests/dashboard-layout.spec.ts`

Expected: FAIL until the selectors and expectations are wired correctly.

**Step 3: Write minimal implementation**

Update dashboard test IDs and the design doc if needed so the intended layout contract is explicit and testable.

The design doc should include a section named `## Mechanical Invariants` with bullet points tied to test IDs.

**Step 4: Run test to verify it passes**

Run:

- `npx vitest run src/pages/DashboardPage.test.tsx`
- `npx playwright test tests/dashboard-layout.spec.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add clients/desktop/src/pages/DashboardPage.test.tsx clients/desktop/tests/dashboard-layout.spec.ts docs/design-docs/desktop-dashboard.md
git commit -m "test: codify dashboard layout invariants"
```

---

### Task 8: Add a standard execution-plan template for non-trivial work

**Files:**
- Create: `docs/exec-plans/plan-template.md`
- Modify: `docs/exec-plans/README.md`
- Create: `clients/desktop/src/tests/execPlanTemplate.test.ts`

**Step 1: Write the failing test**

Create `clients/desktop/src/tests/execPlanTemplate.test.ts` to assert the template contains:

- `#`
- `Goal`
- `Architecture`
- `Files`
- `Step 1: Write the failing test`
- `Step 5: Commit`

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/tests/execPlanTemplate.test.ts`

Expected: FAIL because the template does not exist.

**Step 3: Write minimal implementation**

Create `docs/exec-plans/plan-template.md` with the exact plan shape you want agents to follow in this repo for larger work.

The README should explain:

- when to create a plan
- how to move plans from `active/` to `completed/`
- that plans should contain exact files and verification commands

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/tests/execPlanTemplate.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add docs/exec-plans clients/desktop/src/tests/execPlanTemplate.test.ts
git commit -m "docs: add execution plan template"
```

---

### Task 9: Add lightweight recurring garbage-collection workflows

**Files:**
- Create: `docs/references/agent-garbage-collection.md`
- Modify: `docs/QUALITY_SCORE.md`
- Modify: `docs/exec-plans/tech-debt-tracker.md`

**Step 1: Write the failing test**

Extend `clients/desktop/src/tests/repoDocs.test.ts` to assert:

- `docs/references/agent-garbage-collection.md` exists
- `docs/QUALITY_SCORE.md` includes a `Drift` section
- `docs/exec-plans/tech-debt-tracker.md` includes a `Last Reviewed` heading

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/tests/repoDocs.test.ts`

Expected: FAIL.

**Step 3: Write minimal implementation**

Document a recurring cleanup loop:

- stale docs review
- test-id drift review
- duplicate utility review
- overgrown component/file review
- i18n parity review

Add a `Drift` section to `docs/QUALITY_SCORE.md` and a `Last Reviewed` section to the debt tracker.

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/tests/repoDocs.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add docs clients/desktop/src/tests/repoDocs.test.ts
git commit -m "docs: add agent garbage-collection workflow"
```

---

### Task 10: Run the full harness baseline verification

**Files:**
- Modify: `docs/README.md`
- Modify: `docs/RELIABILITY.md`

**Step 1: Run focused tests**

Run:

```bash
npx vitest run src/tests/repoDocs.test.ts src/tests/qualityScoreScript.test.ts src/tests/repoScripts.test.ts src/tests/verifyWorkflow.test.ts src/tests/execPlanTemplate.test.ts
```

Expected: PASS.

**Step 2: Run existing desktop regression coverage**

Run:

```bash
npx vitest run src/pages/DashboardPage.test.tsx src/pages/PopupPage.test.tsx src/store/useAppStore.test.ts
```

Expected: PASS.

**Step 3: Run typechecks**

Run:

```bash
npx tsc -p clients/desktop/tsconfig.json --noEmit
npx tsc -p shared-logic/tsconfig.json --noEmit
```

Expected: PASS.

**Step 4: Run docs and utility checks**

Run:

```bash
node scripts/check-doc-links.js
node scripts/check-plan-folders.js
node scripts/check-i18n-parity.js
node scripts/quality-score-report.js
```

Expected: PASS.

**Step 5: Update the top-level docs**

Add a short “How agents should work in this repo” section to `docs/README.md` and a final verification checklist to `docs/RELIABILITY.md`.

**Step 6: Commit**

```bash
git add docs scripts package.json clients/desktop/src/tests clients/desktop/tests AGENTS.md ARCHITECTURE.md
git commit -m "feat: add agent-first harness foundation for getupai"
```

---

## Implementation notes

- Do not try to build a giant framework up front
- Avoid adding MCP-specific assumptions into repo docs
- Keep scripts dependency-free Node where possible
- Favor markdown plus tiny check scripts over elaborate platforms
- Every new rule should be easy for both humans and agents to discover

## Success criteria

This plan succeeds when all of the following are true:

- A new agent can start from `AGENTS.md` and find deeper docs quickly
- Product behavior for the main loop and dashboard is documented in-repo
- Larger tasks have a standard executable plan format
- Repo docs and plan structure are mechanically checked
- There is a small, discoverable verification command surface
- Dashboard layout expectations are documented and tested at both unit and browser level
- The repo now supports gradual harness growth instead of ad-hoc tribal knowledge

## Recommended implementation order

1. Task 1
2. Task 2
3. Task 3
4. Task 5
5. Task 6
6. Task 8
7. Task 4
8. Task 7
9. Task 9
10. Task 10
