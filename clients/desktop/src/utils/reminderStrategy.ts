import { DayStats, Settings } from '../store/useAppStore';

export type Period = 'morning' | 'afternoon' | 'evening' | 'night';

export interface PeriodStats {
  period: Period;
  totalReminders: number;
  ignoreCount: number;
  excuseCount: number;
  standCount: number;
}

export const PERIODS: Period[] = ['morning', 'afternoon', 'evening', 'night'];

export function getPeriod(hour: number): Period {
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 24) return 'evening';
  return 'night';
}

export function createPeriodStats(period: Period): PeriodStats {
  return {
    period,
    totalReminders: 0,
    ignoreCount: 0,
    excuseCount: 0,
    standCount: 0,
  };
}

export function calculateAdaptiveInterval(
  baseIntervalMinutes: number,
  periodStats: PeriodStats,
  consecutiveIgnores: number
): number {
  let interval = baseIntervalMinutes;

  // Ignore rate > 50% -> reduce by 20%
  if (periodStats.totalReminders > 0) {
    const ignoreRate = periodStats.ignoreCount / periodStats.totalReminders;
    if (ignoreRate > 0.5) {
      interval *= 0.8;
    }

    // Stand rate > 80% -> increase by 20%
    const standRate = periodStats.standCount / periodStats.totalReminders;
    if (standRate > 0.8) {
      interval *= 1.2;
    }
  }

  // Consecutive ignores >= 3 -> reduce by 50%
  if (consecutiveIgnores >= 3) {
    interval *= 0.5;
  }

  // Ensure reasonable bounds (e.g., minimum 5 minutes, maximum 4 hours)
  return Math.max(5, Math.min(240, Math.round(interval)));
}
