import { describe, expect, it } from 'vitest';
import type { DayHistoryItem, DayStats } from '../../store/useAppStore';
import { buildWeeklyChartData } from './chartData';

function makeHistoryItem(dayKey: string, standCount: number): DayHistoryItem {
  return {
    dayKey,
    standCount,
    standWorkCount: 0,
    excuseCount: 0,
    ignoreCount: 0,
    totalSitMs: 60 * 60 * 1000,
    totalStandMs: 20 * 60 * 1000,
    totalStandWorkMs: 0,
    longestSitMs: 60 * 60 * 1000,
    pauseMinutes: 0,
  };
}

function makeCurrentDay(dayKey: string, standCount: number): DayStats {
  return {
    dayKey,
    standCount,
    standWorkCount: 0,
    excuseCount: 0,
    ignoreCount: 0,
    totalSitMs: 2 * 60 * 60 * 1000,
    totalStandMs: 30 * 60 * 1000,
    totalStandWorkMs: 0,
    longestSitMs: 2 * 60 * 60 * 1000,
    lastStandAt: null,
  };
}

describe('buildWeeklyChartData', () => {
  it('deduplicates repeated day keys and prefers current day data', () => {
    const history = [
      makeHistoryItem('2026-03-12', 2),
      makeHistoryItem('2026-03-13', 3),
      makeHistoryItem('2026-03-16', 9),
    ];
    const currentDay = makeCurrentDay('2026-03-16', 14);

    const data = buildWeeklyChartData(history, currentDay);

    expect(data.filter((item) => item.date === '03-16')).toHaveLength(1);
    expect(data.at(-1)).toEqual({
      date: '03-16',
      standCount: 14,
      sitHours: 2,
    });
  });
});
