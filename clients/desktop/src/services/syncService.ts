/**
 * Local-only sync facade.
 *
 * The app is now single-device only, so these exports remain as no-op shims to
 * preserve existing UI/state integrations without any server dependency.
 */

import type { AppStateSnapshot, SyncStateResponse } from '../../../../shared-logic/src/api-types';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';

let _syncStatus: SyncStatus = 'idle';
const statusSubscribers = new Set<(status: SyncStatus) => void>();

function setSyncStatus(next: SyncStatus) {
  if (_syncStatus === next) return;
  _syncStatus = next;
  for (const cb of statusSubscribers) cb(next);
}

/** Current sync status (imperative read). */
export function getSyncStatus(): SyncStatus {
  return _syncStatus;
}

/** Subscribe to sync status changes. Returns unsubscribe function. */
export function onSyncStatusChange(callback: (status: SyncStatus) => void): () => void {
  statusSubscribers.add(callback);
  return () => {
    statusSubscribers.delete(callback);
  };
}

/** Reactive syncStatus for use in components. */
export const syncStatus = {
  get value() {
    return _syncStatus;
  },
};

/** Local-only pull shim. Always returns no remote state. */
export async function pullState(
  token: string,
): Promise<{ state: AppStateSnapshot | null; updatedAt: string | null }> {
  void token;
  return { state: null, updatedAt: null };
}

/** Local-only push shim. Echoes the local payload. */
export async function pushState(
  token: string,
  state: AppStateSnapshot,
  updatedAt: string,
): Promise<SyncStateResponse> {
  void token;
  return { state, updatedAt, conflict: false } as SyncStateResponse;
}

// ---------------------------------------------------------------------------
// Tiered field-level merge helpers
// ---------------------------------------------------------------------------

/** Safely coerce to number (fallback 0). */
function num(v: unknown): number {
  return typeof v === 'number' && !Number.isNaN(v) ? v : 0;
}

/** Pick the string that compares as "newer" (lexicographic / ISO-date safe). */
function pickNewerStr(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a >= b ? a : b;
}

/** Return whichever value belongs to the more-recent timestamp. */
function pickNewer<T>(a: T, b: T, aTime: number, bTime: number): T {
  return bTime >= aTime ? b : a;
}

/** Shallow merge two Record objects; numeric values take max, others prefer b. */
function mergeByKey(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...a };
  for (const key of Object.keys(b)) {
    const av = a[key];
    const bv = b[key];
    if (typeof av === 'number' && typeof bv === 'number') {
      merged[key] = Math.max(av, bv);
    } else {
      merged[key] = bv ?? av;
    }
  }
  return merged;
}

/** Union-merge two log/event arrays, deduplicating by JSON identity. */
function mergeLogs(
  local: Record<string, unknown>[],
  cloud: Record<string, unknown>[],
): Record<string, unknown>[] {
  const seen = new Set<string>();
  const merged: Record<string, unknown>[] = [];
  for (const entry of [...local, ...cloud]) {
    const id = JSON.stringify(entry);
    if (!seen.has(id)) {
      seen.add(id);
      merged.push(entry);
    }
  }
  return merged;
}

/** Merge period-stats records by key (numeric max). */
function mergePeriodStats(
  local: Record<string, unknown>,
  cloud: Record<string, unknown>,
): Record<string, unknown> {
  return mergeByKey(local, cloud);
}

/** Merge day-history arrays, coalescing entries that share the same date key. */
function mergeDayHistory(
  local: Record<string, unknown>[],
  cloud: Record<string, unknown>[],
): Record<string, unknown>[] {
  const map = new Map<string, Record<string, unknown>>();
  for (const entry of [...local, ...cloud]) {
    const key = String((entry as Record<string, unknown>).date ?? JSON.stringify(entry));
    const existing = map.get(key);
    if (existing) {
      map.set(key, mergeByKey(existing, entry));
    } else {
      map.set(key, entry);
    }
  }
  return Array.from(map.values());
}

/** Merge achievement records (numeric max for unlock timestamps, etc.). */
function mergeAchievements(
  local: Record<string, unknown>,
  cloud: Record<string, unknown>,
): Record<string, unknown> {
  return mergeByKey(local, cloud);
}

/** Merge current-day record (numeric fields take max). */
function mergeDayMax(
  local: Record<string, unknown>,
  cloud: Record<string, unknown>,
): Record<string, unknown> {
  return mergeByKey(local, cloud);
}

/**
 * Tiered field-level merge.
 *
 * - **Config layer** – `settings`: cloud wins (latest pushed settings).
 * - **Session layer** – `mode`, `sitStartAt`, `standStartAt`, etc.: EXCLUDED
 *   (local keeps its own session state; never overwritten by cloud).
 * - **Day-data layer** – `day`, `dayHistory`, `logs`, `periodStats`,
 *   `achievements`, `aiLastNudge*`, `aiInsight*`: merged by max / union.
 */
function mergeStates(
  local: AppStateSnapshot,
  cloud: AppStateSnapshot,
  cloudUpdatedAt: string,
): Partial<AppStateSnapshot> & { updatedAt: string } {
  const lNudge = num(local.aiLastNudgeAt);
  const cNudge = num(cloud.aiLastNudgeAt);

  return {
    // ── Config layer ──
    settings: cloud.settings,

    // ── Day-data layer ──
    day: mergeDayMax(local.day, cloud.day),
    dayHistory: mergeDayHistory(local.dayHistory, cloud.dayHistory),
    logs: mergeLogs(local.logs, cloud.logs),
    periodStats: mergePeriodStats(local.periodStats, cloud.periodStats),
    achievements: mergeAchievements(local.achievements, cloud.achievements),
    aiLastNudge: pickNewer(local.aiLastNudge, cloud.aiLastNudge, lNudge, cNudge),
    aiLastNudgeAt: Math.max(lNudge, cNudge) || null,
    aiInsightLatest: pickNewer(local.aiInsightLatest, cloud.aiInsightLatest, lNudge, cNudge),
    aiInsightHistory: mergeLogs(local.aiInsightHistory, cloud.aiInsightHistory),

    updatedAt: cloudUpdatedAt,

    // ── Session layer ── intentionally omitted:
    // mode, sitStartAt, standStartAt, standWorkStartAt, lastActiveAt,
    // pauseUntil, pauseReason, restSuppressedUntil, nextReminderAt,
    // consecutiveIgnores
  };
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

type GetTokenFn = () => Promise<string | null>;
type GetStateFn = () => { partializedState: AppStateSnapshot; updatedAt: string | null };
type SetStateFn = (state: Partial<AppStateSnapshot> & { updatedAt?: string }) => void;

let _stopSync: (() => void) | null = null;

/**
 * Start sync orchestration.
 * - On app load: pull from cloud, merge (cloud wins if newer).
 * - On state change: debounced push (5s).
 * - On window focus: pull to catch changes from other devices.
 * - On coming online: full pull-then-push.
 */
export function startSync(
  getToken: GetTokenFn,
  getState: GetStateFn,
  setState: SetStateFn,
): () => void {
  void getToken;
  void getState;
  void setState;
  if (_stopSync) _stopSync();
  setSyncStatus('idle');
  _schedulePush = () => {};
  const stop = () => {
    _stopSync = null;
    _schedulePush = null;
  };
  _stopSync = stop;
  return stop;
}

/** Trigger a debounced push. Called by store subscriber on state change. */
let _schedulePush: (() => void) | null = null;

export function notifyStateChanged() {
  _schedulePush?.();
}
