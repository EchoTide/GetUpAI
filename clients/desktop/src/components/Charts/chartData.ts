import type { DayHistoryItem, DayStats } from '../../store/useAppStore';

type ChartHistoryItem = DayHistoryItem | (DayStats & { pauseMinutes?: number });

function byDayKeyAscending(a: ChartHistoryItem, b: ChartHistoryItem) {
  return new Date(a.dayKey).getTime() - new Date(b.dayKey).getTime();
}

function dedupeByDayKey(history: DayHistoryItem[], currentDay: DayStats): ChartHistoryItem[] {
  const byDayKey = new Map<string, ChartHistoryItem>();
  for (const item of history) {
    byDayKey.set(item.dayKey, item);
  }
  byDayKey.set(currentDay.dayKey, { ...currentDay, pauseMinutes: 0 });
  return [...byDayKey.values()].sort(byDayKeyAscending);
}

export function buildWeeklyChartData(history: DayHistoryItem[], currentDay: DayStats) {
  return dedupeByDayKey(history, currentDay)
    .slice(-7)
    .map((item) => ({
      date: item.dayKey.slice(5),
      standCount: item.standCount + item.standWorkCount,
      sitHours: Math.round((item.totalSitMs / 3600000) * 10) / 10,
    }));
}

export function buildMonthlyChartData(history: DayHistoryItem[], currentDay: DayStats) {
  return dedupeByDayKey(history, currentDay)
    .slice(-30)
    .map((item) => {
      const sitHours = item.totalSitMs / 3600000;
      const standMinutes = (item.totalStandMs + item.totalStandWorkMs) / 60000;
      let score = 100 - sitHours * 10 + standMinutes * 0.5;
      score = Math.max(0, Math.min(100, score));

      return {
        date: item.dayKey.slice(5),
        score: Math.round(score),
      };
    });
}
