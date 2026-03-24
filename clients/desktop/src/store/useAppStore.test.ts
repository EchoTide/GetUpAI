import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createJSONStorage } from 'zustand/middleware';
import { createAppStateStorage, useAppStore } from './useAppStore';

function startOfDayTs(ts: number) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

const memoryStorage = (() => {
  const map = new Map<string, string>();
  return {
    getItem: (name: string) => map.get(name) ?? null,
    setItem: (name: string, value: string) => {
      map.set(name, value);
    },
    removeItem: (name: string) => {
      map.delete(name);
    },
    clear: () => {
      map.clear();
    },
  };
})();

beforeAll(() => {
  useAppStore.persist.setOptions({
    storage: createJSONStorage(() => memoryStorage),
  });
});

beforeEach(() => {
  memoryStorage.clear();
  useAppStore.setState(useAppStore.getInitialState(), true);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useAppStore migration', () => {
  it('should migrate from v11 to v12 and add autoStartEnabled default to true', () => {
    // Current version in code is v11. 
    // We want to test that when we bump to v12, autoStartEnabled is added.
    // Since we haven't bumped the version in useAppStore.ts yet, this test will 
    // technically be testing the "current" migrate function if we pass a v11-like state to it.
    
    // Actually, the migrate function is internal to the persist middleware.
    // We can access it via useAppStore.persist.getOptions().migrate
    const migrate = useAppStore.persist.getOptions().migrate;
    
    if (!migrate) {
      throw new Error('Migrate function not found');
    }

    const v11State = {
      settings: {
        language: 'zh',
        intervalMinutes: 60,
        standSeconds: 120,
        restEnabled: true,
        restWindows: [],
        dndEnabled: false,
        aiEnabled: false,
        aiStrictness: 2,
        exerciseGuidanceEnabled: true,
        reminderStrategy: 'fixed',
        enablePreReminder: true,
        idleDetectionEnabled: true,
        idleThresholdMinutes: 5,
        lockScreenPauseEnabled: true,
      },
      day: {
        dayKey: '2024-01-01',
        standCount: 0,
        standWorkCount: 0,
        excuseCount: 0,
        ignoreCount: 0,
        totalSitMs: 0,
        totalStandMs: 0,
        totalStandWorkMs: 0,
        longestSitMs: 0,
        lastStandAt: null,
      },
    };

    const migrated = migrate(v11State, 11) as any;

    expect(migrated.settings.autoStartEnabled).toBe(true);
    // Ensure legacy fields are preserved
    expect(migrated.settings.language).toBe('zh');
    expect(migrated.settings.intervalMinutes).toBe(60);
  });

  it('should preserve existing autoStartEnabled if already present in v11 (negative case/edge case)', () => {
    const migrate = useAppStore.persist.getOptions().migrate;
    if (!migrate) throw new Error('Migrate function not found');

    const v11StateWithField = {
      settings: {
        language: 'en',
        autoStartEnabled: false,
      },
    };

    const migrated = migrate(v11StateWithField, 11) as any;
    expect(migrated.settings.autoStartEnabled).toBe(false);
    expect(migrated.settings.language).toBe('en');
  });
});
describe('update preferences', () => {
  it('should initialize with null values', () => {
    const state = useAppStore.getState();
    expect(state.skippedUpdateVersion).toBeNull();
    expect(state.nextUpdateReminderTime).toBeNull();
  });

  it('should update skippedUpdateVersion when skipVersion is called', () => {
    const { skipVersion } = useAppStore.getState();
    skipVersion('1.1.0');
    expect(useAppStore.getState().skippedUpdateVersion).toBe('1.1.0');
  });

  it('should set nextUpdateReminderTime when remindLater is called', () => {
    vi.useFakeTimers();
    const { remindLater } = useAppStore.getState();
    const now = Date.now();
    vi.setSystemTime(now);
    remindLater(2);
    expect(useAppStore.getState().nextUpdateReminderTime).toBe(now + 2 * 3600000);
  });

  it('should return true for shouldShowUpdate when a new version is available', () => {
    vi.useFakeTimers();
    const { shouldShowUpdate, skipVersion, remindLater } = useAppStore.getState();
    // Reset state for test isolation if needed, but here we can just use fresh logic
    useAppStore.setState({ skippedUpdateVersion: null, nextUpdateReminderTime: null });
    
    expect(shouldShowUpdate('1.1.0', '1.0.0')).toBe(true);
    
    skipVersion('1.1.0');
    expect(shouldShowUpdate('1.1.0', '1.0.0')).toBe(false);
    
    useAppStore.setState({ skippedUpdateVersion: null });
    remindLater(1);
    expect(shouldShowUpdate('1.1.0', '1.0.0')).toBe(false);
    
    vi.advanceTimersByTime(3600001);
    expect(shouldShowUpdate('1.1.0', '1.0.0')).toBe(true);
  });
});

describe('session timestamp guards', () => {
  it('ensureToday rolls over at midnight and starts a new day', () => {
    const beforeMidnight = new Date('2026-03-06T23:59:30+08:00').getTime();
    const afterMidnight = new Date('2026-03-07T00:00:30+08:00').getTime();
    const state = useAppStore.getState();
    useAppStore.setState({
      mode: 'sitting',
      sitStartAt: beforeMidnight - 60 * 60 * 1000,
      lastActiveAt: beforeMidnight,
      day: {
        ...state.day,
        dayKey: '2026-03-06',
        totalSitMs: 10 * 60 * 1000,
      },
      dayHistory: [],
      logs: [],
    });

    useAppStore.getState().ensureToday(afterMidnight);
    const next = useAppStore.getState();
    expect(next.day.dayKey).toBe('2026-03-07');
    expect(next.day.totalSitMs).toBe(0);
    expect(next.mode).toBe('sitting');
    expect(next.sitStartAt).toBe(afterMidnight);
    expect(next.dayHistory.some((x) => x.dayKey === '2026-03-06')).toBe(true);
  });

  it('repairInvalidState resets sitting start that does not belong to current day', () => {
    const now = new Date('2026-03-06T12:00:00+08:00').getTime();
    const oldStart = new Date('2026-03-05T21:00:00+08:00').getTime();

    const state = useAppStore.getState();
    useAppStore.setState({
      mode: 'sitting',
      sitStartAt: oldStart,
      day: {
        ...state.day,
        dayKey: '2026-03-06',
      },
      lastActiveAt: now,
    });

    useAppStore.getState().repairInvalidState(now);
    expect(useAppStore.getState().sitStartAt).toBe(now);
  });

  it('sanitizeBootBoundary trims stale pre-boot sitting state', () => {
    const now = Date.now() + 4 * 3600000;
    const bootAt = now - 3 * 3600000;
    const staleSitStartAt = now - 8 * 3600000;

    const state = useAppStore.getState();
    useAppStore.setState({
      mode: 'sitting',
      sitStartAt: staleSitStartAt,
      day: {
        ...state.day,
        dayKey: '2026-03-06',
        standCount: 0,
        standWorkCount: 0,
        totalSitMs: 2 * 3600000,
        longestSitMs: 2 * 3600000,
      },
      logs: [],
      lastActiveAt: now,
    });

    useAppStore.getState().sanitizeBootBoundary(now, bootAt);
    const next = useAppStore.getState();
    expect(next.sitStartAt).toBeTypeOf('number');
    expect((next.sitStartAt as number) >= bootAt).toBe(true);
    const currentSitMs = next.mode === 'sitting' && next.sitStartAt ? Math.max(0, now - next.sitStartAt) : 0;
    const todaySitMs = next.day.totalSitMs + currentSitMs;
    expect(todaySitMs <= now - Math.max(startOfDayTs(now), bootAt)).toBe(true);
  });

  it('sanitizeBootBoundary clamps impossible accumulated sit time to boot-day window', () => {
    const now = Date.now() + 4 * 3600000;
    const bootAt = now - 3 * 3600000;
    const sitStartAt = now - 1 * 3600000;

    const state = useAppStore.getState();
    useAppStore.setState({
      mode: 'sitting',
      sitStartAt,
      day: {
        ...state.day,
        dayKey: '2026-03-06',
        totalSitMs: 7 * 3600000,
        longestSitMs: 7 * 3600000,
      },
      lastActiveAt: now,
    });

    useAppStore.getState().sanitizeBootBoundary(now, bootAt);
    const next = useAppStore.getState();
    const currentSitMs = next.mode === 'sitting' && next.sitStartAt ? Math.max(0, now - next.sitStartAt) : 0;
    const todaySitMs = next.day.totalSitMs + currentSitMs;
    expect(todaySitMs <= now - Math.max(startOfDayTs(now), bootAt)).toBe(true);
    expect(next.day.totalSitMs <= 7 * 3600000).toBe(true);
  });

  it('sanitizeBootBoundary preserves same-day accumulated sit time across app restart', () => {
    const now = Date.now();
    const bootAt = now - 3 * 3600000;
    const sitStartAt = now - 10 * 60 * 1000;
    const dayKey = (() => {
      const d = new Date(now);
      const pad2 = (n: number) => n.toString().padStart(2, '0');
      return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    })();

    const state = useAppStore.getState();
    useAppStore.setState({
      mode: 'sitting',
      sitStartAt,
      day: {
        ...state.day,
        dayKey,
        totalSitMs: 2 * 3600000,
        longestSitMs: 2 * 3600000,
      },
      lastActiveAt: now,
    });

    useAppStore.getState().sanitizeBootBoundary(now, bootAt);
    const next = useAppStore.getState();

    expect(next.day.totalSitMs).toBe(2 * 3600000);
    expect(next.sitStartAt).toBe(sitStartAt);
  });

  it('checkpointToday persists in-progress sitting time into day totals before restart', () => {
    const now = new Date('2026-03-06T15:00:00+08:00').getTime();
    const sitStartAt = now - 90 * 60 * 1000;
    const dayKey = '2026-03-06';

    const state = useAppStore.getState();
    useAppStore.setState({
      mode: 'sitting',
      sitStartAt,
      lastActiveAt: now,
      day: {
        ...state.day,
        dayKey,
        totalSitMs: 30 * 60 * 1000,
        longestSitMs: 30 * 60 * 1000,
      },
      dayHistory: [],
      logs: [],
    });

    useAppStore.getState().checkpointToday(now);
    const next = useAppStore.getState();
    const today = next.dayHistory.find((x) => x.dayKey === dayKey);

    expect(today?.totalSitMs).toBe(120 * 60 * 1000);
    expect(next.day.totalSitMs).toBe(120 * 60 * 1000);
    expect(next.sitStartAt).toBe(now);
  });

  it('enterIdle does not interrupt active standing work sessions', () => {
    const startAt = new Date('2026-03-06T14:00:00+08:00').getTime();
    const idleAt = startAt + 15 * 60 * 1000;
    const state = useAppStore.getState();

    useAppStore.setState({
      mode: 'standing_work',
      sitStartAt: null,
      standStartAt: null,
      standWorkStartAt: startAt,
      pauseUntil: null,
      pauseReason: null,
      lastActiveAt: idleAt,
      day: {
        ...state.day,
        dayKey: '2026-03-06',
      },
    });

    useAppStore.getState().enterIdle(idleAt, 'idle');

    const next = useAppStore.getState();
    expect(next.mode).toBe('standing_work');
    expect(next.standWorkStartAt).toBe(startAt);
    expect(next.pauseReason).toBeNull();
  });

  it('enterIdle does not interrupt active standing sessions', () => {
    const startAt = new Date('2026-03-06T14:00:00+08:00').getTime();
    const idleAt = startAt + 15 * 60 * 1000;
    const state = useAppStore.getState();

    useAppStore.setState({
      mode: 'standing',
      sitStartAt: null,
      standStartAt: startAt,
      standWorkStartAt: null,
      pauseUntil: null,
      pauseReason: null,
      lastActiveAt: idleAt,
      day: {
        ...state.day,
        dayKey: '2026-03-06',
      },
    });

    useAppStore.getState().enterIdle(idleAt, 'idle');

    const next = useAppStore.getState();
    expect(next.mode).toBe('standing');
    expect(next.standStartAt).toBe(startAt);
    expect(next.pauseReason).toBeNull();
  });

  it('exitIdle preserves the remaining reminder time instead of resetting the full interval', () => {
    const baseNow = new Date('2026-03-06T14:00:00+08:00').getTime();
    const idleAt = baseNow + 5 * 60 * 1000;
    const resumeAt = idleAt + 5 * 60 * 1000;
    const originalReminderAt = baseNow + 20 * 60 * 1000;
    const state = useAppStore.getState();

    useAppStore.setState({
      mode: 'sitting',
      sitStartAt: baseNow - 40 * 60 * 1000,
      standStartAt: null,
      standWorkStartAt: null,
      pauseUntil: null,
      pauseReason: null,
      nextReminderAt: originalReminderAt,
      lastActiveAt: idleAt,
      day: {
        ...state.day,
        dayKey: '2026-03-06',
      },
    });

    useAppStore.getState().enterIdle(idleAt, 'idle');
    useAppStore.getState().exitIdle(resumeAt);

    const next = useAppStore.getState();
    expect(next.mode).toBe('sitting');
    expect(next.pauseReason).toBeNull();
    expect(next.sitStartAt).toBe(resumeAt);
    expect(next.nextReminderAt).toBe(resumeAt + 15 * 60 * 1000);
  });
});

describe('app state storage', () => {
  it('prefers synchronous Electron-backed persistence when available', () => {
    const getItemSync = vi.fn().mockReturnValue('{"value":1}');
    const setItemSync = vi.fn();
    const removeItemSync = vi.fn();
    const fakeWindow = {
      electronAPI: {
        getPersistedStateSync: getItemSync,
        setPersistedStateSync: setItemSync,
        removePersistedStateSync: removeItemSync,
      },
    } as unknown as Window;

    const storage = createAppStateStorage(fakeWindow);
    const value = storage.getItem('getup-ai-store-v2');

    expect(value).toBe('{"value":1}');
    expect(getItemSync).toHaveBeenCalledWith('getup-ai-store-v2');

    storage.setItem('getup-ai-store-v2', '{"value":2}');
    storage.removeItem('getup-ai-store-v2');

    expect(setItemSync).toHaveBeenCalledWith('getup-ai-store-v2', '{"value":2}');
    expect(removeItemSync).toHaveBeenCalledWith('getup-ai-store-v2');
  });

  it('prefers Electron-backed persistence when available', async () => {
    const getItem = vi.fn().mockResolvedValue('{"value":1}');
    const setItem = vi.fn().mockResolvedValue(undefined);
    const removeItem = vi.fn().mockResolvedValue(undefined);
    const fakeWindow = {
      electronAPI: {
        getPersistedState: getItem,
        setPersistedState: setItem,
        removePersistedState: removeItem,
      },
    } as unknown as Window;

    const storage = createAppStateStorage(fakeWindow);

    await expect(storage.getItem('getup-ai-store-v2')).resolves.toBe('{"value":1}');
    await storage.setItem('getup-ai-store-v2', '{"value":2}');
    await storage.removeItem('getup-ai-store-v2');

    expect(getItem).toHaveBeenCalledWith('getup-ai-store-v2');
    expect(setItem).toHaveBeenCalledWith('getup-ai-store-v2', '{"value":2}');
    expect(removeItem).toHaveBeenCalledWith('getup-ai-store-v2');
  });

  it('migrates legacy localStorage state into Electron persistence on first read', async () => {
    const getItem = vi.fn().mockResolvedValue(null);
    const setItem = vi.fn().mockResolvedValue(undefined);
    const removeItem = vi.fn().mockResolvedValue(undefined);
    const localStorage = {
      getItem: vi.fn().mockReturnValue('{"state":{"day":{"totalSitMs":123}}}'),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    } as unknown as Storage;
    const fakeWindow = {
      electronAPI: {
        getPersistedState: getItem,
        setPersistedState: setItem,
        removePersistedState: removeItem,
      },
      localStorage,
    } as unknown as Window;

    const storage = createAppStateStorage(fakeWindow);

    await expect(storage.getItem('getup-ai-store-v2')).resolves.toBe('{"state":{"day":{"totalSitMs":123}}}');

    expect(localStorage.getItem).toHaveBeenCalledWith('getup-ai-store-v2');
    expect(setItem).toHaveBeenCalledWith('getup-ai-store-v2', '{"state":{"day":{"totalSitMs":123}}}');
  });
});
