import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { AchievementState, checkAchievements } from '../utils/achievements';
import { isNewerVersion } from '../services/updateService';
import { Period, PeriodStats, createPeriodStats, getPeriod, calculateAdaptiveInterval } from '../utils/reminderStrategy';

export type Mode = 'sitting' | 'standing' | 'standing_work' | 'paused';

export interface Settings {
  language: 'zh' | 'en';
  intervalMinutes: number;
  standSeconds: number;
  restEnabled: boolean;
  restWindows: { id: string; enabled: boolean; startMinute: number; endMinute: number }[];
  dndEnabled: boolean;
  aiEnabled: boolean;
  aiStrictness: 1 | 2 | 3;
  exerciseGuidanceEnabled: boolean;
  reminderStrategy: 'fixed' | 'adaptive';
  enablePreReminder: boolean;
  idleDetectionEnabled: boolean;
  idleThresholdMinutes: number;
  lockScreenPauseEnabled: boolean;
  autoStartEnabled: boolean;
}


export interface DayStats {
  dayKey: string;
  standCount: number;
  standWorkCount: number;
  excuseCount: number;
  ignoreCount: number;
  totalSitMs: number;
  totalStandMs: number;
  totalStandWorkMs: number;
  longestSitMs: number;
  lastStandAt: number | null;
}

export interface DayHistoryItem {
  dayKey: string;
  standCount: number;
  standWorkCount: number;
  excuseCount: number;
  ignoreCount: number;
  totalSitMs: number;
  totalStandMs: number;
  totalStandWorkMs: number;
  longestSitMs: number;
  pauseMinutes: number;
}

export interface ActivityLog {
  id: string;
  at: number;
  type:
    | 'stood'
    | 'excuse'
    | 'pause'
    | 'resume'
    | 'trigger'
    | 'ignore'
    | 'stand_work_start'
    | 'stand_work_end'
    | 'dnd_on'
    | 'dnd_off';
  payload?: Record<string, unknown>;
}

export interface DailyInsight {
  dayKey: string;
  at: number;
  text: string;
}

export interface AdaptiveIntervalChangeInfo {
  oldInterval: number;
  newInterval: number;
  reason: 'adaptive_ignore_rate' | 'adaptive_stand_rate' | 'adaptive_consecutive_ignores';
}

export interface AppState {
  mode: Mode;
  sitStartAt: number | null;
  standStartAt: number | null;
  standWorkStartAt: number | null;
  lastActiveAt: number | null;
  pauseUntil: number | null;
  pauseReason: 'manual' | 'rest' | 'dnd' | 'idle' | 'lock' | null;
  pausedReminderRemainingMs: number | null;
  restSuppressedUntil: number | null;
  nextReminderAt: number;
  settings: Settings;
  day: DayStats;
  dayHistory: DayHistoryItem[];
  logs: ActivityLog[];
  aiLastNudge: string | null;
  aiLastNudgeAt: number | null;
  aiInsightLatest: DailyInsight | null;
  aiInsightHistory: DailyInsight[];
  achievements: AchievementState;

  periodStats: Record<Period, PeriodStats>;
  consecutiveIgnores: number;
  updatedAt: string | null;
  userId: string | null;
  lastAdaptiveIntervalChange: AdaptiveIntervalChangeInfo | null;
  skippedUpdateVersion: string | null;
  nextUpdateReminderTime: number | null;

  ensureToday: (now: number) => void;
  repairInvalidState: (now: number) => void;
  sanitizeBootBoundary: (now: number, bootAt?: number | null) => void;
  updateSettings: (partial: Partial<Settings>) => void;
  setAiLastNudge: (now: number, text: string) => void;
  upsertDailyInsight: (dayKey: string, now: number, text: string) => void;
  applySchedule: (now: number) => void;
  endRestEarly: (now: number) => void;
  enableDnd: (now: number) => void;
  disableDnd: (now: number) => void;
  checkpointToday: (now: number) => void;
  cancelStanding: (now: number) => void;
  triggerReminder: (now: number) => void;
  startStanding: (now: number) => void;
  finishStanding: (now: number) => void;
  recordStand: (now: number, standDurationMs?: number) => void;
  startStandingWork: (now: number) => void;
  stopStandingWork: (now: number) => void;
  submitExcuse: (now: number, excuse: string, reply: string) => void;
  ignoreReminder: (now: number) => void;
  pauseForMinutes: (now: number, minutes: number) => void;
  resume: (now: number) => void;
  enterIdle: (now: number, reason: 'idle' | 'lock') => void;
  exitIdle: (now: number) => void;
  setSyncedState: (incoming: Partial<AppState>) => void;
  markUpdated: () => void;
  skipVersion: (version: string) => void;
  remindLater: (hours: number) => void;
  shouldShowUpdate: (latestVersion: string, currentVersion: string) => boolean;
}

function pad2(n: number) {
  return n.toString().padStart(2, '0');
}

function dayKeyFromTs(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function startOfDayTs(ts: number) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function isTsInDay(ts: number, dayKey: string) {
  return Number.isFinite(ts) && dayKeyFromTs(ts) === dayKey;
}

function randomId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function clampMs(ms: number) {
  if (!Number.isFinite(ms)) return 0;
  return ms < 0 ? 0 : ms;
}

function clampInt(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function localMinuteOfDay(ts: number) {
  const d = new Date(ts);
  return d.getHours() * 60 + d.getMinutes();
}

function computeRestUntil(now: number, settings: Settings) {
  if (!settings.restEnabled) return null;
  const m = localMinuteOfDay(now);
  const base = new Date(now);

  let best: number | null = null;
  for (const w of settings.restWindows ?? []) {
    if (!w.enabled) continue;
    const start = w.startMinute;
    const end = w.endMinute;
    const inRange = start < end ? m >= start && m < end : m >= start || m < end;
    if (!inRange) continue;

    const endDate = new Date(base);
    endDate.setHours(Math.floor(end / 60), end % 60, 0, 0);
    if (start < end) {
      if (endDate.getTime() <= now) endDate.setDate(endDate.getDate() + 1);
    } else {
      if (m >= start) endDate.setDate(endDate.getDate() + 1);
    }
    const ts = endDate.getTime();
    if (best === null || ts < best) best = ts;
  }
  return best;
}

function createNewDay(dayKey: string): DayStats {
  return {
    dayKey,
    standCount: 0,
    standWorkCount: 0,
    excuseCount: 0,
    ignoreCount: 0,
    totalSitMs: 0,
    totalStandMs: 0,
    totalStandWorkMs: 0,
    longestSitMs: 0,
    lastStandAt: null,
  };
}

function pauseMinutesForDay(logs: ActivityLog[], dayKey: string) {
  return logs
    .filter((x) => x.type === 'pause' && dayKeyFromTs(x.at) === dayKey)
    .map((x) => Number((x.payload as any)?.minutes))
    .filter((n) => Number.isFinite(n) && n > 0)
    .reduce((a, b) => a + b, 0);
}

function buildHistoryItem(day: DayStats, logs: ActivityLog[]): DayHistoryItem {
  return {
    dayKey: day.dayKey,
    standCount: day.standCount,
    standWorkCount: day.standWorkCount,
    excuseCount: day.excuseCount,
    ignoreCount: day.ignoreCount,
    totalSitMs: day.totalSitMs,
    totalStandMs: day.totalStandMs,
    totalStandWorkMs: day.totalStandWorkMs,
    longestSitMs: day.longestSitMs,
    pauseMinutes: pauseMinutesForDay(logs, day.dayKey),
  };
}

function updateAchievementsAndStreak(state: AppState, newDay: DayStats, now: number): AchievementState {
  let achievements = { ...state.achievements };
  
  const prevTotal = state.day.standCount + state.day.standWorkCount;
  const newTotal = newDay.standCount + newDay.standWorkCount;
  
  if (prevTotal === 0 && newTotal > 0) {
     const todayKey = newDay.dayKey;
     if (achievements.lastStreakDate !== todayKey) {
         const d = new Date(now);
         d.setDate(d.getDate() - 1);
         const pad2 = (n: number) => n.toString().padStart(2, '0');
         const yesterdayKey = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
         
         if (achievements.lastStreakDate === yesterdayKey) {
             achievements.streakDays += 1;
         } else {
             achievements.streakDays = 1;
         }
         achievements.lastStreakDate = todayKey;
     }
  }
  
  const tempState = { ...state, day: newDay, achievements };
  const unlocked = checkAchievements(tempState);
  if (unlocked.length > 0) {
      const newUnlocked = { ...achievements.unlockedAchievements };
      let changed = false;
      for (const id of unlocked) {
          if (!newUnlocked[id]) {
              newUnlocked[id] = now;
              changed = true;
          }
      }
      if (changed) {
          achievements.unlockedAchievements = newUnlocked;
      }
  }
  
  return achievements;
}

function prependLog(log: ActivityLog, logs: ActivityLog[]) {
  return [log, ...logs].slice(0, 2000);
}

const defaultLanguage = (typeof navigator !== 'undefined' && navigator.language.startsWith('zh')) ? 'zh' : 'en';
const APP_SESSION_START_AT = Date.now();

type PersistBridge = {
  getPersistedStateSync?: (name: string) => string | null;
  setPersistedStateSync?: (name: string, value: string) => void;
  removePersistedStateSync?: (name: string) => void;
  getPersistedState?: (name: string) => Promise<string | null>;
  setPersistedState?: (name: string, value: string) => Promise<void>;
  removePersistedState?: (name: string) => Promise<void>;
};

export function createAppStateStorage(targetWindow?: Window & { electronAPI?: PersistBridge }) {
  const safeWindow = targetWindow ?? (typeof window !== 'undefined' ? window : undefined);
  const bridge = safeWindow?.electronAPI;

  if (bridge?.getPersistedStateSync && bridge?.setPersistedStateSync && bridge?.removePersistedStateSync) {
    return {
      getItem: (name: string) => {
        const persisted = bridge.getPersistedStateSync!(name);
        if (persisted !== null) return persisted;

        const legacy = safeWindow?.localStorage?.getItem(name) ?? null;
        if (legacy !== null) {
          try {
            bridge.setPersistedStateSync!(name, legacy);
          } catch {
          }
        }
        return legacy;
      },
      setItem: (name: string, value: string) => bridge.setPersistedStateSync!(name, value),
      removeItem: (name: string) => bridge.removePersistedStateSync!(name),
    };
  }

  if (bridge?.getPersistedState && bridge?.setPersistedState && bridge?.removePersistedState) {
    return {
      getItem: async (name: string) => {
        const persisted = await bridge.getPersistedState!(name);
        if (persisted !== null) return persisted;

        const legacy = safeWindow?.localStorage?.getItem(name) ?? null;
        if (legacy !== null) {
          try {
            await bridge.setPersistedState!(name, legacy);
          } catch {
          }
        }
        return legacy;
      },
      setItem: (name: string, value: string) => bridge.setPersistedState!(name, value),
      removeItem: (name: string) => bridge.removePersistedState!(name),
    };
  }

  if (safeWindow?.localStorage) {
    return safeWindow.localStorage;
  }

  return {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  };
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      mode: 'sitting',
      sitStartAt: Date.now(),
      standStartAt: null,
      standWorkStartAt: null,
      lastActiveAt: Date.now(),
      pauseUntil: null,
      pauseReason: null,
      pausedReminderRemainingMs: null,
      restSuppressedUntil: null,
      nextReminderAt: Date.now() + 60 * 60 * 1000,
      settings: {
        language: defaultLanguage,
        intervalMinutes: 60,
        standSeconds: 120,
        restEnabled: true,
        restWindows: [{ id: randomId(), enabled: true, startMinute: 12 * 60, endMinute: 13 * 60 }],
        dndEnabled: false,
        aiEnabled: true,
        aiStrictness: 2,
        exerciseGuidanceEnabled: true,
        reminderStrategy: 'fixed',
        enablePreReminder: true,
        idleDetectionEnabled: true,
        idleThresholdMinutes: 5,
        lockScreenPauseEnabled: true,
        autoStartEnabled: true,
      },

      day: createNewDay(dayKeyFromTs(Date.now())),
      dayHistory: [],
      logs: [],
      aiLastNudge: null,
      aiLastNudgeAt: null,
      aiInsightLatest: null,
      aiInsightHistory: [],
      achievements: {
        unlockedAchievements: {},
        streakDays: 0,
        lastStreakDate: null,
        dailyGoal: 6,
      },
      periodStats: {
        morning: createPeriodStats('morning'),
        afternoon: createPeriodStats('afternoon'),
        evening: createPeriodStats('evening'),
        night: createPeriodStats('night'),
      },
      consecutiveIgnores: 0,
      updatedAt: null,
      userId: null,
      lastAdaptiveIntervalChange: null,
      skippedUpdateVersion: null,
      nextUpdateReminderTime: null,

      ensureToday: (now) => {
        const OFFLINE_GAP_MS = 5 * 60 * 1000;
        // BUGFIX: Extended offline threshold for computer sleep/shutdown scenarios.
        // When computer is off/sleeping while user is in standing_work mode,
        // we should not auto-end their session. 2 hours allows for lunch breaks
        // while still detecting true multi-day inactivity.
        const EXTENDED_OFFLINE_MS = 2 * 60 * 60 * 1000;
        const intervalMs = get().settings.intervalMinutes * 60 * 1000;
        const currentKey = dayKeyFromTs(now);
        const state = get();
        const lastActiveAt = typeof state.lastActiveAt === 'number' ? state.lastActiveAt : null;
        const gapMs = typeof lastActiveAt === 'number' ? now - lastActiveAt : 0;

        let nextMode = state.mode;
        let nextSitStartAt = state.sitStartAt;
        let nextStandStartAt = state.standStartAt;
        let nextStandWorkStartAt = state.standWorkStartAt;
        let nextDay = state.day;
        let nextLogs = state.logs;
        let nextNextReminderAt = state.nextReminderAt;

        if (nextMode === 'sitting' && typeof nextSitStartAt === 'number') {
          if (nextSitStartAt > now || !isTsInDay(nextSitStartAt, nextDay.dayKey)) {
            nextSitStartAt = now;
          }
        }
        if (nextMode === 'standing') {
          if (
            typeof nextStandStartAt !== 'number' ||
            nextStandStartAt > now ||
            !isTsInDay(nextStandStartAt, nextDay.dayKey)
          ) {
            nextMode = 'sitting';
            nextSitStartAt = now;
            nextStandStartAt = null;
            nextNextReminderAt = now + intervalMs;
          }
        }
        if (nextMode === 'standing_work') {
          if (
            typeof nextStandWorkStartAt !== 'number' ||
            nextStandWorkStartAt > now ||
            !isTsInDay(nextStandWorkStartAt, nextDay.dayKey)
          ) {
            nextMode = 'sitting';
            nextSitStartAt = now;
            nextStandWorkStartAt = null;
            nextNextReminderAt = now + intervalMs;
          }
        }

        // BUGFIX: Handle gaps caused by computer sleep/suspend/shutdown.
        // For sitting/standing: use 5-min threshold so sleep time is NOT counted as sitting.
        // For standing_work: keep 2-hour threshold to not interrupt during lunch breaks.
        if (Number.isFinite(gapMs) && gapMs > OFFLINE_GAP_MS && typeof lastActiveAt === 'number') {
          const cutAt = lastActiveAt;
          if (nextMode === 'sitting' && nextSitStartAt) {
            // Cut sitting time at lastActiveAt (before the gap), not at now.
            // This prevents sleep/suspend duration from being counted as sitting.
            const sitDurationMs = clampMs(cutAt - nextSitStartAt);
            if (sitDurationMs > 0) {
              nextDay = {
                ...nextDay,
                totalSitMs: nextDay.totalSitMs + sitDurationMs,
                longestSitMs: Math.max(nextDay.longestSitMs, sitDurationMs),
              };
            }
            nextSitStartAt = now;
          } else if (nextMode === 'standing') {
            nextMode = 'sitting';
            nextSitStartAt = now;
            nextStandStartAt = null;
            nextNextReminderAt = now + intervalMs;
          }
          // For standing_work: only auto-end with extended threshold (2+ hours)
          if (gapMs > EXTENDED_OFFLINE_MS) {
            if (nextMode === 'standing_work' && nextStandWorkStartAt) {
              const standDurationMs = clampMs(cutAt - nextStandWorkStartAt);
              if (standDurationMs > 0) {
                nextDay = {
                  ...nextDay,
                  totalStandMs: nextDay.totalStandMs + standDurationMs,
                  totalStandWorkMs: nextDay.totalStandWorkMs + standDurationMs,
                  standWorkCount: nextDay.standWorkCount + 1,
                  lastStandAt: cutAt,
                };
                nextLogs = prependLog(
                  { id: randomId(), at: cutAt, type: 'stand_work_end', payload: { standDurationMs, reason: 'inactive' } },
                  nextLogs,
                );
              }
              nextMode = 'sitting';
              nextSitStartAt = now;
              nextStandWorkStartAt = null;
              nextNextReminderAt = now + intervalMs;
            }
          }
        }

        if (nextDay.dayKey !== currentKey) {
          const boundary = startOfDayTs(now);
          const cutAt = typeof lastActiveAt === 'number' ? Math.min(lastActiveAt, boundary) : boundary;
          const oldKey = nextDay.dayKey;

          const prevHistory = state.dayHistory ?? [];
          const existingHistoryItem = prevHistory.find((x) => x.dayKey === oldKey);

          // If yesterday already exists in history, keep it as-is (idempotent rollover).
          if (!existingHistoryItem) {
            // Close the previous day at midnight boundary, then hard reset all daily runtime state.
            if (nextMode === 'sitting' && nextSitStartAt && nextSitStartAt < boundary) {
              const sitDurationMs = clampMs(cutAt - nextSitStartAt);
              if (sitDurationMs > 0) {
                nextDay = {
                  ...nextDay,
                  totalSitMs: nextDay.totalSitMs + sitDurationMs,
                  longestSitMs: Math.max(nextDay.longestSitMs, sitDurationMs),
                };
              }
            } else if (nextMode === 'standing_work' && nextStandWorkStartAt && nextStandWorkStartAt < boundary) {
              const standDurationMs = clampMs(cutAt - nextStandWorkStartAt);
              if (standDurationMs > 0) {
                nextDay = {
                  ...nextDay,
                  totalStandMs: nextDay.totalStandMs + standDurationMs,
                  totalStandWorkMs: nextDay.totalStandWorkMs + standDurationMs,
                  standWorkCount: nextDay.standWorkCount + 1,
                  lastStandAt: cutAt,
                };
                nextLogs = prependLog(
                  { id: randomId(), at: cutAt, type: 'stand_work_end', payload: { standDurationMs, reason: 'day_rollover' } },
                  nextLogs,
                );
              }
            } else if (nextMode === 'standing' && nextStandStartAt && nextStandStartAt < boundary) {
              const standDurationMs = clampMs(cutAt - nextStandStartAt);
              if (standDurationMs > 0) {
                nextDay = {
                  ...nextDay,
                  totalStandMs: nextDay.totalStandMs + standDurationMs,
                  lastStandAt: cutAt,
                };
              }
            }
          }

          const historyItem = existingHistoryItem ?? buildHistoryItem(nextDay, nextLogs);
          const nextHistory = [historyItem, ...prevHistory.filter((x) => x.dayKey !== historyItem.dayKey)].slice(0, 30);

          set({
            day: createNewDay(currentKey),
            dayHistory: nextHistory,
            logs: nextLogs.slice(-2000),
            mode: 'sitting',
            sitStartAt: now,
            standStartAt: null,
            standWorkStartAt: null,
            pauseUntil: null,
            pauseReason: null,
            restSuppressedUntil: null,
            nextReminderAt: now + intervalMs,
            lastActiveAt: now,
            aiInsightLatest: state.aiInsightLatest && state.aiInsightLatest.dayKey === oldKey ? null : state.aiInsightLatest,
            consecutiveIgnores: 0,
          });
          return;
        }

        if (
          nextMode !== state.mode ||
          nextSitStartAt !== state.sitStartAt ||
          nextStandStartAt !== state.standStartAt ||
          nextStandWorkStartAt !== state.standWorkStartAt ||
          nextDay !== state.day ||
          nextLogs !== state.logs ||
          nextNextReminderAt !== state.nextReminderAt ||
          now !== state.lastActiveAt
        ) {
          set({
            mode: nextMode,
            sitStartAt: nextSitStartAt,
            standStartAt: nextStandStartAt,
            standWorkStartAt: nextStandWorkStartAt,
            day: nextDay,
            logs: nextLogs,
            nextReminderAt: nextNextReminderAt,
            lastActiveAt: now,
          });
        }
      },

      repairInvalidState: (now) => {
        const state = get();
        const intervalMs = state.settings.intervalMinutes * 60 * 1000;
        if (
          state.mode === 'standing' &&
          (typeof state.standStartAt !== 'number' || state.standStartAt > now || !isTsInDay(state.standStartAt, state.day.dayKey))
        ) {
          set({
            mode: 'sitting',
            sitStartAt: now,
            standStartAt: null,
            standWorkStartAt: null,
            pauseUntil: null,
            pauseReason: null,
            nextReminderAt: now + intervalMs,
          });
          return;
        }
        if (
          state.mode === 'standing_work' &&
          (typeof state.standWorkStartAt !== 'number' ||
            state.standWorkStartAt > now ||
            !isTsInDay(state.standWorkStartAt, state.day.dayKey))
        ) {
          set({
            mode: 'sitting',
            sitStartAt: now,
            standStartAt: null,
            standWorkStartAt: null,
            pauseUntil: null,
            pauseReason: null,
            nextReminderAt: now + intervalMs,
          });
          return;
        }
        if (
          state.mode === 'sitting' &&
          (typeof state.sitStartAt !== 'number' || state.sitStartAt > now || !isTsInDay(state.sitStartAt, state.day.dayKey))
        ) {
          set({
            sitStartAt: now,
            nextReminderAt: now + intervalMs,
          });
          return;
        }
        if (state.mode === 'paused' && state.pauseReason !== 'dnd' && !state.pauseUntil) {
          set({
            mode: 'sitting',
            sitStartAt: now,
            pauseUntil: null,
            pauseReason: null,
            nextReminderAt: now + intervalMs,
          });
        }
      },

      sanitizeBootBoundary: (now, bootAt) => {
        const state = get();
        const intervalMs = state.settings.intervalMinutes * 60 * 1000;
        const dayBoundary = startOfDayTs(now);
        const bootBoundary =
          typeof bootAt === 'number' && Number.isFinite(bootAt)
            ? Math.max(dayBoundary, Math.min(now, Math.floor(bootAt)))
            : dayBoundary;
        const boundary = bootBoundary;

        let nextMode = state.mode;
        let nextSitStartAt = state.sitStartAt;
        let nextStandStartAt = state.standStartAt;
        let nextStandWorkStartAt = state.standWorkStartAt;
        let nextNextReminderAt = state.nextReminderAt;
        let nextDay = state.day;
        let changed = false;

        if (nextMode === 'sitting') {
          if (typeof nextSitStartAt !== 'number' || nextSitStartAt < boundary || nextSitStartAt > now) {
            nextSitStartAt = boundary;
            changed = true;
          }
        }
        if (nextMode === 'standing' && (typeof nextStandStartAt !== 'number' || nextStandStartAt < boundary || nextStandStartAt > now)) {
          nextMode = 'sitting';
          nextSitStartAt = now;
          nextStandStartAt = null;
          nextStandWorkStartAt = null;
          nextNextReminderAt = now + intervalMs;
          changed = true;
        }
        if (
          nextMode === 'standing_work' &&
          (typeof nextStandWorkStartAt !== 'number' || nextStandWorkStartAt < boundary || nextStandWorkStartAt > now)
        ) {
          nextMode = 'sitting';
          nextSitStartAt = now;
          nextStandStartAt = null;
          nextStandWorkStartAt = null;
          nextNextReminderAt = now + intervalMs;
          changed = true;
        }

        const effectiveSitStartAt = nextMode === 'sitting' ? nextSitStartAt : null;
        const currentSitMs =
          nextMode === 'sitting' && typeof effectiveSitStartAt === 'number' ? clampMs(now - effectiveSitStartAt) : 0;
        const maxAccumulatedSitMs = clampMs(now - boundary - currentSitMs);
        const correctedTotalSitMs = Math.min(Math.max(0, nextDay.totalSitMs), maxAccumulatedSitMs);
        const correctedLongestSitMs = Math.min(Math.max(0, nextDay.longestSitMs), correctedTotalSitMs);
        if (correctedTotalSitMs !== nextDay.totalSitMs || correctedLongestSitMs !== nextDay.longestSitMs) {
          nextDay = {
            ...nextDay,
            totalSitMs: correctedTotalSitMs,
            longestSitMs: correctedLongestSitMs,
          };
          changed = true;
        }

        if (!changed) return;
        set({
          mode: nextMode,
          sitStartAt: nextSitStartAt,
          standStartAt: nextMode === 'standing' ? nextStandStartAt : null,
          standWorkStartAt: nextMode === 'standing_work' ? nextStandWorkStartAt : null,
          nextReminderAt: nextNextReminderAt,
          day: nextDay,
          lastActiveAt: now,
        });
      },

      updateSettings: (partial) => {
        const state = get();
        set({ settings: { ...state.settings, ...partial } });
      },

      setAiLastNudge: (now, text) => {
        set({ aiLastNudge: text, aiLastNudgeAt: now });
      },

      upsertDailyInsight: (dayKey, now, text) => {
        const state = get();
        const nextItem: DailyInsight = { dayKey, at: now, text };
        const prev = state.aiInsightHistory ?? [];
        const without = prev.filter((x) => x.dayKey !== dayKey);
        const nextHistory = [nextItem, ...without].slice(0, 14);
        set({ aiInsightLatest: nextItem, aiInsightHistory: nextHistory });
      },

      applySchedule: (now) => {
        get().ensureToday(now);
        const state = get();
        if (state.settings.dndEnabled || state.pauseReason === 'dnd') return;
        if (state.restSuppressedUntil && now < state.restSuppressedUntil) return;
        const restUntil = computeRestUntil(now, state.settings);
        if (!restUntil) {
          if (state.restSuppressedUntil) set({ restSuppressedUntil: null });
          return;
        }
        if (!restUntil) return;
        if (state.mode === 'paused' && state.pauseReason === 'rest') {
          if (state.pauseUntil !== restUntil) set({ pauseUntil: restUntil });
          return;
        }

        let newDay = state.day;
        if (state.mode === 'sitting' && state.sitStartAt) {
          const sitDurationMs = clampMs(now - state.sitStartAt);
          newDay = {
            ...newDay,
            totalSitMs: newDay.totalSitMs + sitDurationMs,
            longestSitMs: Math.max(newDay.longestSitMs, sitDurationMs),
          };
        }
        if (state.mode === 'standing_work' && state.standWorkStartAt) {
          const standDurationMs = clampMs(now - state.standWorkStartAt);
          newDay = {
            ...newDay,
            totalStandMs: newDay.totalStandMs + standDurationMs,
            totalStandWorkMs: newDay.totalStandWorkMs + standDurationMs,
            standWorkCount: newDay.standWorkCount + 1,
            lastStandAt: now,
          };
        }

        set({
          mode: 'paused',
          sitStartAt: null,
          standStartAt: null,
          standWorkStartAt: null,
          pauseUntil: restUntil,
          pauseReason: 'rest',
          day: newDay,
          logs: prependLog({ id: randomId(), at: now, type: 'pause', payload: { reason: 'rest' } }, state.logs),
        });
      },

      endRestEarly: (now) => {
        get().ensureToday(now);
        const state = get();
        const restUntil = computeRestUntil(now, state.settings);
        const intervalMs = state.settings.intervalMinutes * 60 * 1000;
        set({
          mode: 'sitting',
          sitStartAt: now,
          standStartAt: null,
          standWorkStartAt: null,
          pauseUntil: null,
          pauseReason: null,
          nextReminderAt: now + intervalMs,
          restSuppressedUntil: restUntil ?? state.restSuppressedUntil,
          logs: prependLog({ id: randomId(), at: now, type: 'resume', payload: { reason: 'rest_ended_early' } }, state.logs),
        });
      },

      enableDnd: (now) => {
        get().ensureToday(now);
        const state = get();
        if (state.settings.dndEnabled && state.pauseReason === 'dnd') return;

        let newDay = state.day;
        if (state.mode === 'sitting' && state.sitStartAt) {
          const sitDurationMs = clampMs(now - state.sitStartAt);
          newDay = {
            ...newDay,
            totalSitMs: newDay.totalSitMs + sitDurationMs,
            longestSitMs: Math.max(newDay.longestSitMs, sitDurationMs),
          };
        }
        if (state.mode === 'standing' && state.standStartAt) {
          const standDurationMs = clampMs(now - state.standStartAt);
          newDay = {
            ...newDay,
            totalStandMs: newDay.totalStandMs + standDurationMs,
            lastStandAt: now,
          };
        }
        if (state.mode === 'standing_work' && state.standWorkStartAt) {
          const standDurationMs = clampMs(now - state.standWorkStartAt);
          newDay = {
            ...newDay,
            totalStandMs: newDay.totalStandMs + standDurationMs,
            totalStandWorkMs: newDay.totalStandWorkMs + standDurationMs,
            standWorkCount: newDay.standWorkCount + 1,
            lastStandAt: now,
          };
        }

        set({
          settings: { ...state.settings, dndEnabled: true },
          mode: 'paused',
          sitStartAt: null,
          standStartAt: null,
          standWorkStartAt: null,
          pauseUntil: null,
          pauseReason: 'dnd',
          day: newDay,
          logs: prependLog({ id: randomId(), at: now, type: 'dnd_on' }, state.logs),
        });
      },

      disableDnd: (now) => {
        get().ensureToday(now);
        const state = get();
        if (!state.settings.dndEnabled && state.pauseReason !== 'dnd') return;
        const intervalMs = state.settings.intervalMinutes * 60 * 1000;
        set({
          settings: { ...state.settings, dndEnabled: false },
          mode: 'sitting',
          sitStartAt: now,
          standStartAt: null,
          standWorkStartAt: null,
          pauseUntil: null,
          pauseReason: null,
          nextReminderAt: now + intervalMs,
          logs: prependLog({ id: randomId(), at: now, type: 'dnd_off' }, state.logs),
        });
        get().applySchedule(now);
      },

      checkpointToday: (now) => {
        get().ensureToday(now);
        const state = get();
        let nextDay = state.day;
        let nextSitStartAt = state.sitStartAt;

        if (state.mode === 'sitting' && typeof state.sitStartAt === 'number') {
          const sitDurationMs = clampMs(now - state.sitStartAt);
          if (sitDurationMs > 0) {
            nextDay = {
              ...state.day,
              totalSitMs: state.day.totalSitMs + sitDurationMs,
              longestSitMs: Math.max(state.day.longestSitMs, sitDurationMs),
            };
            nextSitStartAt = now;
          }
        }

        const item = buildHistoryItem(nextDay, state.logs);
        const prev = state.dayHistory ?? [];
        const nextHistory = [item, ...prev.filter((x) => x.dayKey !== item.dayKey)].slice(0, 30);
        set({ day: nextDay, dayHistory: nextHistory, sitStartAt: nextSitStartAt, lastActiveAt: now });
      },

      cancelStanding: (now) => {
        get().ensureToday(now);
        const state = get();
        if (state.mode !== 'standing' || !state.standStartAt) return;

        const standDurationMs = clampMs(now - state.standStartAt);
        const intervalMs = state.settings.intervalMinutes * 60 * 1000;

        set({
          mode: 'sitting',
          sitStartAt: now,
          standStartAt: null,
          standWorkStartAt: null,
          pauseUntil: null,
          pauseReason: null,
          nextReminderAt: now + intervalMs,
          day: {
            ...state.day,
            totalStandMs: state.day.totalStandMs + standDurationMs,
            lastStandAt: now,
          },
          logs: prependLog({ id: randomId(), at: now, type: 'stood', payload: { standDurationMs, aborted: true } }, state.logs),
        });
      },

      triggerReminder: (now) => {
        get().ensureToday(now);
        const { settings, logs, periodStats } = get();
        if (settings.dndEnabled) return;
        
        const period = getPeriod(new Date(now).getHours());
        const newStats = {
          ...periodStats,
          [period]: {
            ...periodStats[period],
            totalReminders: periodStats[period].totalReminders + 1
          }
        };

        set({
          nextReminderAt: now + 5 * 60 * 1000,
          logs: prependLog({ id: randomId(), at: now, type: 'trigger' }, logs),
          periodStats: newStats,
        });
      },

      startStanding: (now) => {
        get().ensureToday(now);
        const state = get();
        if (state.mode !== 'sitting' || !state.sitStartAt) return;

        const sitDurationMs = clampMs(now - state.sitStartAt);
        const newTotalSitMs = state.day.totalSitMs + sitDurationMs;
        const newLongestSitMs = Math.max(state.day.longestSitMs, sitDurationMs);

        set({
          mode: 'standing',
          sitStartAt: null,
          standStartAt: now,
          day: {
            ...state.day,
            totalSitMs: newTotalSitMs,
            longestSitMs: newLongestSitMs,
          },
          lastActiveAt: now,  // BUGFIX: Update lastActiveAt to prevent ensureToday from resetting state
        });
      },


      finishStanding: (now) => {
        get().ensureToday(now);
        const state = get();
        if (state.mode !== 'standing' || !state.standStartAt) return;

        const standDurationMs = clampMs(now - state.standStartAt);
        const newTotalStandMs = state.day.totalStandMs + standDurationMs;

        const period = getPeriod(new Date(now).getHours());
        let newIntervalMinutes = state.settings.intervalMinutes;
        const oldIntervalMinutes = newIntervalMinutes;
        let adaptiveReason: AdaptiveIntervalChangeInfo['reason'] | undefined;
        if (state.settings.reminderStrategy === 'adaptive') {
          // User just stood — treat consecutiveIgnores as 0 for next interval
          newIntervalMinutes = calculateAdaptiveInterval(
            state.settings.intervalMinutes,
            state.periodStats[period],
            0,
          );
          if (newIntervalMinutes < oldIntervalMinutes) {
            if (state.consecutiveIgnores >= 3) {
              adaptiveReason = 'adaptive_consecutive_ignores';
            } else if (
              state.periodStats[period].totalReminders > 0 &&
              state.periodStats[period].ignoreCount / state.periodStats[period].totalReminders > 0.5
            ) {
              adaptiveReason = 'adaptive_ignore_rate';
            }
          } else if (newIntervalMinutes > oldIntervalMinutes) {
            if (
              state.periodStats[period].totalReminders > 0 &&
              state.periodStats[period].standCount / state.periodStats[period].totalReminders > 0.8
            ) {
              adaptiveReason = 'adaptive_stand_rate';
            }
          }
        }
        const newNextReminderAt = now + newIntervalMinutes * 60 * 1000;

        const newStats = {
          ...state.periodStats,
          [period]: {
            ...state.periodStats[period],
            standCount: state.periodStats[period].standCount + 1,
          },
        };

        const newDay = {
          ...state.day,
          totalStandMs: newTotalStandMs,
          standCount: state.day.standCount + 1,
          lastStandAt: now,
        };
        const newAchievements = updateAchievementsAndStreak(state, newDay, now);

        set({
          mode: 'sitting',
          sitStartAt: now,
          standStartAt: null,
          standWorkStartAt: null,
          pauseUntil: null,
          pauseReason: null,
          nextReminderAt: newNextReminderAt,
          day: newDay,
          achievements: newAchievements,
          logs: prependLog({ id: randomId(), at: now, type: 'stood', payload: { standDurationMs } }, state.logs),
          periodStats: newStats,
          consecutiveIgnores: 0,
          lastAdaptiveIntervalChange: adaptiveReason
            ? { oldInterval: oldIntervalMinutes, newInterval: newIntervalMinutes, reason: adaptiveReason }
            : null,
        });
      },

      recordStand: (now, standDurationMs) => {
        get().ensureToday(now);
        const state = get();

        let newDay = state.day;
        if (state.mode === 'sitting' && state.sitStartAt) {
          const sitDurationMs = clampMs(now - state.sitStartAt);
          newDay = {
            ...newDay,
            totalSitMs: newDay.totalSitMs + sitDurationMs,
            longestSitMs: Math.max(newDay.longestSitMs, sitDurationMs),
          };
        }

        const durationFromArg = typeof standDurationMs === 'number' ? clampMs(standDurationMs) : state.settings.standSeconds * 1000;
        const durationFromState =
          state.mode === 'standing' && state.standStartAt ? clampMs(now - state.standStartAt) : durationFromArg;
        newDay = {
          ...newDay,
          totalStandMs: newDay.totalStandMs + durationFromState,
          standCount: newDay.standCount + 1,
          lastStandAt: now,
        };

        const newAchievements = updateAchievementsAndStreak(state, newDay, now);

        const period = getPeriod(new Date(now).getHours());
        let newIntervalMinutes = state.settings.intervalMinutes;
        const oldIntervalMinutes = newIntervalMinutes;
        let adaptiveReason: AdaptiveIntervalChangeInfo['reason'] | undefined;
        if (state.settings.reminderStrategy === 'adaptive') {
          // User just stood — treat consecutiveIgnores as 0 for next interval
          newIntervalMinutes = calculateAdaptiveInterval(
            state.settings.intervalMinutes,
            state.periodStats[period],
            0,
          );
          if (newIntervalMinutes < oldIntervalMinutes) {
            if (state.consecutiveIgnores >= 3) {
              adaptiveReason = 'adaptive_consecutive_ignores';
            } else if (
              state.periodStats[period].totalReminders > 0 &&
              state.periodStats[period].ignoreCount / state.periodStats[period].totalReminders > 0.5
            ) {
              adaptiveReason = 'adaptive_ignore_rate';
            }
          } else if (newIntervalMinutes > oldIntervalMinutes) {
            if (
              state.periodStats[period].totalReminders > 0 &&
              state.periodStats[period].standCount / state.periodStats[period].totalReminders > 0.8
            ) {
              adaptiveReason = 'adaptive_stand_rate';
            }
          }
        }
        const newStats = {
          ...state.periodStats,
          [period]: {
            ...state.periodStats[period],
            standCount: state.periodStats[period].standCount + 1,
          },
        };

        set({
          mode: 'sitting',
          sitStartAt: now,
          standStartAt: null,
          standWorkStartAt: null,
          pauseUntil: null,
          pauseReason: null,
          nextReminderAt: now + newIntervalMinutes * 60 * 1000,
          day: newDay,
          achievements: newAchievements,
          logs: prependLog({ id: randomId(), at: now, type: 'stood', payload: { standDurationMs: durationFromState } }, state.logs),
          periodStats: newStats,
          consecutiveIgnores: 0,
          lastAdaptiveIntervalChange: adaptiveReason
            ? { oldInterval: oldIntervalMinutes, newInterval: newIntervalMinutes, reason: adaptiveReason }
            : null,
        });
      },

      startStandingWork: (now) => {
        get().ensureToday(now);
        const state = get();
        
        if (state.mode === 'sitting' && state.sitStartAt) {
          const sitDurationMs = clampMs(now - state.sitStartAt);
          const newTotalSitMs = state.day.totalSitMs + sitDurationMs;
          const newLongestSitMs = Math.max(state.day.longestSitMs, sitDurationMs);

          set({
            mode: 'standing_work',
            sitStartAt: null,
            standStartAt: null,
            standWorkStartAt: now,
            day: { ...state.day, totalSitMs: newTotalSitMs, longestSitMs: newLongestSitMs },
            logs: prependLog({ id: randomId(), at: now, type: 'stand_work_start' }, state.logs),
            lastActiveAt: now,  // BUGFIX: Update lastActiveAt to prevent ensureToday from resetting state
          });
        } else if (state.mode === 'standing' && state.standStartAt) {
          const standDurationMs = clampMs(now - state.standStartAt);
          const newTotalStandMs = state.day.totalStandMs + standDurationMs;
          
          const period = getPeriod(new Date(now).getHours());
          const newStats = {
            ...state.periodStats,
            [period]: {
              ...state.periodStats[period],
              standCount: state.periodStats[period].standCount + 1
            }
          };

          const newDay = {
            ...state.day,
            totalStandMs: newTotalStandMs,
            standCount: state.day.standCount + 1,
            lastStandAt: now,
          };
          const newAchievements = updateAchievementsAndStreak(state, newDay, now);

          set({
            mode: 'standing_work',
            sitStartAt: null,
            standStartAt: null,
            standWorkStartAt: now,
            day: newDay,
            achievements: newAchievements,
            logs: prependLog(
              { id: randomId(), at: now, type: 'stand_work_start' },
              prependLog({ id: randomId(), at: now, type: 'stood', payload: { standDurationMs } }, state.logs)
            ),
            periodStats: newStats,
            consecutiveIgnores: 0,
            lastActiveAt: now,  // BUGFIX: Update lastActiveAt to prevent ensureToday from resetting state
          });
        }
      },

      stopStandingWork: (now) => {
        get().ensureToday(now);
        const state = get();
        if (state.mode !== 'standing_work' || !state.standWorkStartAt) return;

        const standDurationMs = clampMs(now - state.standWorkStartAt);
        const intervalMs = state.settings.intervalMinutes * 60 * 1000;
        
        const newDay = {
            ...state.day,
            totalStandMs: state.day.totalStandMs + standDurationMs,
            totalStandWorkMs: state.day.totalStandWorkMs + standDurationMs,
            standWorkCount: state.day.standWorkCount + 1,
            lastStandAt: now,
        };
        const newAchievements = updateAchievementsAndStreak(state, newDay, now);

        set({
          mode: 'sitting',
          sitStartAt: now,
          standStartAt: null,
          standWorkStartAt: null,
          pauseUntil: null,
          pauseReason: null,
          nextReminderAt: now + intervalMs,
          day: newDay,
          achievements: newAchievements,
          logs: prependLog({ id: randomId(), at: now, type: 'stand_work_end', payload: { standDurationMs } }, state.logs),
        });
      },

      submitExcuse: (now, excuse, reply) => {
        get().ensureToday(now);
        const state = get();
        const newDay = { ...state.day, excuseCount: state.day.excuseCount + 1 };
        const newAchievements = updateAchievementsAndStreak(state, newDay, now);
        
        const period = getPeriod(new Date(now).getHours());
        const newStats = {
          ...state.periodStats,
          [period]: {
            ...state.periodStats[period],
            excuseCount: state.periodStats[period].excuseCount + 1
          }
        };

        set({
          day: newDay,
          achievements: newAchievements,
          logs: prependLog({ id: randomId(), at: now, type: 'excuse', payload: { excuse, reply } }, state.logs),
          periodStats: newStats,
          consecutiveIgnores: 0,
        });
      },

      ignoreReminder: (now) => {
        get().ensureToday(now);
        const state = get();
        
        const period = getPeriod(new Date(now).getHours());
        const newStats = {
          ...state.periodStats,
          [period]: {
            ...state.periodStats[period],
            ignoreCount: state.periodStats[period].ignoreCount + 1
          }
        };

        set({
          nextReminderAt: now + 5 * 60 * 1000,
          day: { ...state.day, ignoreCount: state.day.ignoreCount + 1 },
          logs: prependLog({ id: randomId(), at: now, type: 'ignore' }, state.logs),
          periodStats: newStats,
          consecutiveIgnores: state.consecutiveIgnores + 1,
        });
      },

      pauseForMinutes: (now, minutes) => {
        get().ensureToday(now);
        const state = get();
        let newDay = state.day;
        if (state.mode === 'sitting' && state.sitStartAt) {
          const sitDurationMs = clampMs(now - state.sitStartAt);
          newDay = {
            ...newDay,
            totalSitMs: newDay.totalSitMs + sitDurationMs,
            longestSitMs: Math.max(newDay.longestSitMs, sitDurationMs),
          };
        }
        if (state.mode === 'standing_work' && state.standWorkStartAt) {
          const standDurationMs = clampMs(now - state.standWorkStartAt);
          newDay = {
            ...newDay,
            totalStandMs: newDay.totalStandMs + standDurationMs,
            totalStandWorkMs: newDay.totalStandWorkMs + standDurationMs,
            standWorkCount: newDay.standWorkCount + 1,
            lastStandAt: now,
          };
        }

        const clampedMinutes = clampInt(minutes, 0, 365 * 24 * 60);

        set({
          mode: 'paused',
          sitStartAt: null,
          standStartAt: null,
          standWorkStartAt: null,
          pauseUntil: now + clampedMinutes * 60 * 1000,
          pauseReason: 'manual',
          pausedReminderRemainingMs: null,
          day: newDay,
          logs: prependLog(
            { id: randomId(), at: now, type: 'pause', payload: { minutes: clampedMinutes, reason: 'manual' } },
            state.logs,
          ),
        });
      },

      enterIdle: (now, reason) => {
        get().ensureToday(now);
        const state = get();
        if (state.mode === 'paused') return;
        if (state.mode !== 'sitting') return;

        // BUGFIX: Use lastActiveAt as cutoff when there's been a gap (e.g. sleep/suspend).
        // ensureToday above should already handle this, but this is a safety net.
        const lastActive = typeof state.lastActiveAt === 'number' ? state.lastActiveAt : now;
        const safeCutoff = (now - lastActive > 5 * 60 * 1000) ? lastActive : now;

        let newDay = state.day;
        if (state.mode === 'sitting' && state.sitStartAt) {
          const sitDurationMs = clampMs(safeCutoff - state.sitStartAt);
          newDay = {
            ...newDay,
            totalSitMs: newDay.totalSitMs + sitDurationMs,
            longestSitMs: Math.max(newDay.longestSitMs, sitDurationMs),
          };
        }

        set({
          mode: 'paused',
          sitStartAt: null,
          standStartAt: null,
          standWorkStartAt: null,
          pauseUntil: null,
          pauseReason: reason,
          pausedReminderRemainingMs: clampMs(state.nextReminderAt - now),
          day: newDay,
          logs: prependLog({ id: randomId(), at: now, type: 'pause', payload: { reason } }, state.logs),
        });
      },

      exitIdle: (now) => {
        get().ensureToday(now);
        const state = get();
        if (state.mode !== 'paused') return;
        if (state.pauseReason !== 'idle' && state.pauseReason !== 'lock') return;

        const remainingMs =
          typeof state.pausedReminderRemainingMs === 'number' ? clampMs(state.pausedReminderRemainingMs) : null;
        const intervalMs = state.settings.intervalMinutes * 60 * 1000;
        set({
          mode: 'sitting',
          sitStartAt: now,
          pauseUntil: null,
          pauseReason: null,
          pausedReminderRemainingMs: null,
          nextReminderAt: now + (remainingMs ?? intervalMs),
          logs: prependLog({ id: randomId(), at: now, type: 'resume', payload: { reason: 'idle_end' } }, state.logs),
        });
      },

      resume: (now) => {
        get().ensureToday(now);
        const state = get();
        if (state.mode !== 'paused') return;

        const intervalMs = state.settings.intervalMinutes * 60 * 1000;
        set({
          mode: 'sitting',
          sitStartAt: now,
          pauseUntil: null,
          pauseReason: null,
          pausedReminderRemainingMs: null,
          nextReminderAt: now + intervalMs,
          logs: prependLog({ id: randomId(), at: now, type: 'resume' }, state.logs),
        });
      },

      setSyncedState: (incoming) => {
        set(incoming);
      },

      markUpdated: () => {
        set({ updatedAt: new Date().toISOString() });
      },
      skipVersion: (version) => {
        set({ skippedUpdateVersion: version });
      },
      remindLater: (hours) => {
        set({ nextUpdateReminderTime: Date.now() + hours * 3600000 });
      },
      shouldShowUpdate: (latestVersion, currentVersion) => {
        const { skippedUpdateVersion, nextUpdateReminderTime } = get();
        if (latestVersion === skippedUpdateVersion) return false;
        if (nextUpdateReminderTime && Date.now() < nextUpdateReminderTime) return false;
        return isNewerVersion(currentVersion, latestVersion);
      },
    }),
    {
      name: 'getup-ai-store-v2',
      storage: createJSONStorage(() => createAppStateStorage()),
      version: 13,
      migrate: (persistedState, version) => {
        const s = persistedState as any;
        const settings = s?.settings ?? {};
        // v13: preserve legacy persisted metadata fields during migration
        const updatedAt = version < 13 ? (typeof s?.updatedAt === 'string' ? s.updatedAt : null) : s?.updatedAt ?? null;
        const userId = version < 13 ? (typeof s?.userId === 'string' ? s.userId : null) : s?.userId ?? null;
        // v12: add autoStartEnabled
        const autoStartEnabled = version < 12 ? (typeof settings.autoStartEnabled === 'boolean' ? settings.autoStartEnabled : true) : settings.autoStartEnabled;

        const language = (settings.language === 'zh' || settings.language === 'en') ? settings.language : defaultLanguage;

        const restEnabled = typeof settings.restEnabled === 'boolean' ? settings.restEnabled : true;
        const legacyStart = typeof settings.restStartMinute === 'number' ? settings.restStartMinute : 12 * 60;
        const legacyEnd = typeof settings.restEndMinute === 'number' ? settings.restEndMinute : 13 * 60;
        const rawWindows = Array.isArray(settings.restWindows) ? settings.restWindows : [];
        const normalizedWindows = rawWindows
          .map((w: any) => ({
            id: typeof w?.id === 'string' ? w.id : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
            enabled: typeof w?.enabled === 'boolean' ? w.enabled : restEnabled,
            startMinute: typeof w?.startMinute === 'number' ? w.startMinute : legacyStart,
            endMinute: typeof w?.endMinute === 'number' ? w.endMinute : legacyEnd,
          }))
          .slice(0, 20);
        const restWindowsFromLegacy =
          normalizedWindows.length > 0
            ? normalizedWindows
            : [{ id: `${Date.now().toString(36)}-rest`, enabled: restEnabled, startMinute: legacyStart, endMinute: legacyEnd }];
        const day = s?.day ?? {};
        const legacyNudge = typeof s?.aiLastMessage === 'string' ? s.aiLastMessage : null;
        const legacyNudgeAt = typeof s?.aiLastMessageAt === 'number' ? s.aiLastMessageAt : null;
        const legacyNote = typeof s?.aiDailyNote === 'string' ? s.aiDailyNote : null;
        const legacyNoteDayKey = typeof s?.aiDailyNoteDayKey === 'string' ? s.aiDailyNoteDayKey : null;
        const legacyInsight =
          legacyNote && legacyNoteDayKey ? ({ dayKey: legacyNoteDayKey, at: legacyNudgeAt ?? Date.now(), text: legacyNote } as DailyInsight) : null;
        const history = Array.isArray(s?.dayHistory) ? (s.dayHistory as any[]).filter(Boolean).slice(0, 30) : [];
        const inferredLastActiveAtRaw = (() => {
          const candidates: number[] = [];
          const logs = Array.isArray(s?.logs) ? (s.logs as any[]) : [];
          const logAt = logs
            .map((x) => (typeof x?.at === 'number' ? x.at : NaN))
            .filter((n) => Number.isFinite(n))
            .reduce((m, n) => Math.max(m, n), Number.NEGATIVE_INFINITY);
          if (Number.isFinite(logAt)) candidates.push(logAt);
          if (typeof s?.aiLastNudgeAt === 'number') candidates.push(s.aiLastNudgeAt);
          if (typeof legacyNudgeAt === 'number') candidates.push(legacyNudgeAt);
          if (typeof s?.sitStartAt === 'number') candidates.push(s.sitStartAt);
          if (typeof s?.standStartAt === 'number') candidates.push(s.standStartAt);
          if (typeof s?.standWorkStartAt === 'number') candidates.push(s.standWorkStartAt);
          if (typeof s?.day?.lastStandAt === 'number') candidates.push(s.day.lastStandAt);
          return candidates.length ? Math.max(...candidates) : NaN;
        })();
        const inferredLastActiveAt = Number.isFinite(inferredLastActiveAtRaw) ? Math.min(Date.now(), inferredLastActiveAtRaw) : null;
        const currentLastActiveAt = typeof s?.lastActiveAt === 'number' ? s.lastActiveAt : null;
        const nextLastActiveAt = (() => {
          if (typeof currentLastActiveAt === 'number' && Number.isFinite(currentLastActiveAt) && currentLastActiveAt > 0) {
            const looksSynthetic = Math.abs(Date.now() - currentLastActiveAt) < 2 * 60 * 1000;
            const inferredIsOlder =
              typeof inferredLastActiveAt === 'number' && Number.isFinite(inferredLastActiveAt) && inferredLastActiveAt < currentLastActiveAt - 60 * 1000;
            if (looksSynthetic && inferredIsOlder) return inferredLastActiveAt;
            return currentLastActiveAt;
          }
          if (typeof inferredLastActiveAt === 'number' && Number.isFinite(inferredLastActiveAt) && inferredLastActiveAt > 0) return inferredLastActiveAt;
          return 0;
        })();
        return {
          ...s,
          lastActiveAt: nextLastActiveAt,
          settings: {
            language,
            intervalMinutes: Number.isFinite(settings.intervalMinutes) ? clampInt(settings.intervalMinutes, 1, 240) : 60,
            standSeconds: Number.isFinite(settings.standSeconds) ? clampInt(settings.standSeconds, 60, 30 * 60) : 120,
            restEnabled,
            restWindows: restWindowsFromLegacy,
            dndEnabled: typeof settings.dndEnabled === 'boolean' ? settings.dndEnabled : false,
            aiEnabled: typeof settings.aiEnabled === 'boolean' ? settings.aiEnabled : true,
            aiStrictness:
              settings.aiStrictness === 1 || settings.aiStrictness === 2 || settings.aiStrictness === 3 ? settings.aiStrictness : 2,
            exerciseGuidanceEnabled: typeof settings.exerciseGuidanceEnabled === 'boolean' ? settings.exerciseGuidanceEnabled : true,
            reminderStrategy: typeof settings.reminderStrategy === 'string' ? settings.reminderStrategy : 'fixed',
            enablePreReminder: typeof settings.enablePreReminder === 'boolean' ? settings.enablePreReminder : true,
            idleDetectionEnabled: typeof settings.idleDetectionEnabled === 'boolean' ? settings.idleDetectionEnabled : true,
            idleThresholdMinutes: Number.isFinite(settings.idleThresholdMinutes) ? clampInt(settings.idleThresholdMinutes, 1, 60) : 5,
            lockScreenPauseEnabled: typeof settings.lockScreenPauseEnabled === 'boolean' ? settings.lockScreenPauseEnabled : true,
            autoStartEnabled: typeof autoStartEnabled === 'boolean' ? autoStartEnabled : true,
          },

          day: {
            ...day,
            standWorkCount: Number.isFinite(day?.standWorkCount) ? Math.max(0, Math.floor(day.standWorkCount)) : 0,
            totalStandWorkMs: Number.isFinite(day?.totalStandWorkMs) ? Math.max(0, day.totalStandWorkMs) : 0,
            standCount: Number.isFinite(day?.standCount) ? Math.max(0, Math.floor(day.standCount)) : 0,
            excuseCount: Number.isFinite(day?.excuseCount) ? Math.max(0, Math.floor(day.excuseCount)) : 0,
            ignoreCount: Number.isFinite(day?.ignoreCount) ? Math.max(0, Math.floor(day.ignoreCount)) : 0,
            totalSitMs: Number.isFinite(day?.totalSitMs) ? Math.max(0, day.totalSitMs) : 0,
            totalStandMs: Number.isFinite(day?.totalStandMs) ? Math.max(0, day.totalStandMs) : 0,
            longestSitMs: Number.isFinite(day?.longestSitMs) ? Math.max(0, day.longestSitMs) : 0,
          },
          dayHistory: history,
          pauseReason: s?.pauseReason ?? null,
          pausedReminderRemainingMs:
            typeof s?.pausedReminderRemainingMs === 'number' && Number.isFinite(s.pausedReminderRemainingMs)
              ? Math.max(0, s.pausedReminderRemainingMs)
              : null,
          restSuppressedUntil: s?.restSuppressedUntil ?? null,
          standWorkStartAt: s?.standWorkStartAt ?? null,
          aiLastNudge: legacyNudge,
          aiLastNudgeAt: legacyNudgeAt,
          aiInsightLatest: legacyInsight,
          aiInsightHistory: legacyInsight ? [legacyInsight] : [],
          periodStats: s?.periodStats ?? {
            morning: createPeriodStats('morning'),
            afternoon: createPeriodStats('afternoon'),
            evening: createPeriodStats('evening'),
            night: createPeriodStats('night'),
          },
          consecutiveIgnores: typeof s?.consecutiveIgnores === 'number' ? s.consecutiveIgnores : 0,
          achievements: s?.achievements ?? {
            unlockedAchievements: {},
            streakDays: 0,
            lastStreakDate: null,
            dailyGoal: 6,
          },
          updatedAt,
          userId,
        };
      },
      onRehydrateStorage: () => (state) => {
        try {
          const now = Date.now();
          state?.ensureToday(now);
          state?.repairInvalidState(now);
        } catch {}
      },
      partialize: (state) => ({
        mode: state.mode,
        sitStartAt: state.sitStartAt,
        standStartAt: state.standStartAt,
        standWorkStartAt: state.standWorkStartAt,
        lastActiveAt: state.lastActiveAt,
        pauseUntil: state.pauseUntil,
        pauseReason: state.pauseReason,
        pausedReminderRemainingMs: state.pausedReminderRemainingMs,
        restSuppressedUntil: state.restSuppressedUntil,
        nextReminderAt: state.nextReminderAt,
        settings: state.settings,
        day: state.day,
        dayHistory: state.dayHistory,
        logs: state.logs.slice(0, 2000),
        aiLastNudge: state.aiLastNudge,
        aiLastNudgeAt: state.aiLastNudgeAt,
        aiInsightLatest: state.aiInsightLatest,
        aiInsightHistory: state.aiInsightHistory,
        periodStats: state.periodStats,
        consecutiveIgnores: state.consecutiveIgnores,
        achievements: state.achievements,
        updatedAt: state.updatedAt,
        userId: state.userId,
        skippedUpdateVersion: state.skippedUpdateVersion,
        nextUpdateReminderTime: state.nextUpdateReminderTime,
      }),
    },
  ),
);
