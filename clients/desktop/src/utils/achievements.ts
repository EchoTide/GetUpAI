import { AppState, DayHistoryItem, DayStats } from '../store/useAppStore';

export interface AchievementDef {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export interface AchievementState {
  unlockedAchievements: Record<string, number>; // id -> timestamp
  streakDays: number;
  lastStreakDate: string | null; // "YYYY-MM-DD"
  dailyGoal: number; // default 6
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first_stand',
    name: 'achievements.items.first_stand.name',
    icon: '🌱',
    description: 'achievements.items.first_stand.desc',
  },
  {
    id: 'streak_3',
    name: 'achievements.items.streak_3.name',
    icon: '📅',
    description: 'achievements.items.streak_3.desc',
  },
  {
    id: 'streak_7',
    name: 'achievements.items.streak_7.name',
    icon: '🔥',
    description: 'achievements.items.streak_7.desc',
  },
  {
    id: 'streak_30',
    name: 'achievements.items.streak_30.name',
    icon: '💪',
    description: 'achievements.items.streak_30.desc',
  },
  {
    id: 'streak_100',
    name: 'achievements.items.streak_100.name',
    icon: '👑',
    description: 'achievements.items.streak_100.desc',
  },
  {
    id: 'daily_10',
    name: 'achievements.items.daily_10.name',
    icon: '🏃',
    description: 'achievements.items.daily_10.desc',
  },
  {
    id: 'daily_20',
    name: 'achievements.items.daily_20.name',
    icon: '🦿',
    description: 'achievements.items.daily_20.desc',
  },
  {
    id: 'stand_hour',
    name: 'achievements.items.stand_hour.name',
    icon: '⏱️',
    description: 'achievements.items.stand_hour.desc',
  },
  {
    id: 'stand_work_hour',
    name: 'achievements.items.stand_work_hour.name',
    icon: '💻',
    description: 'achievements.items.stand_work_hour.desc',
  },
  {
    id: 'no_excuse',
    name: 'achievements.items.no_excuse.name',
    icon: '🧘',
    description: 'achievements.items.no_excuse.desc',
  },
  {
    id: 'early_bird',
    name: 'achievements.items.early_bird.name',
    icon: '🌅',
    description: 'achievements.items.early_bird.desc',
  },
  {
    id: 'night_owl',
    name: 'achievements.items.night_owl.name',
    icon: '🦉',
    description: 'achievements.items.night_owl.desc',
  },
  {
    id: 'health_guard',
    name: 'achievements.items.health_guard.name',
    icon: '📈',
    description: 'achievements.items.health_guard.desc',
  },
];

export function calculateHealthScore(sitMs: number, standMs: number): number {
  const sitHours = sitMs / 3600000;
  const standMinutes = standMs / 60000;
  // Formula from DashboardPage: 100 - sitHours * 10 + standMinutes * 0.5
  const value = 100 - sitHours * 10 + standMinutes * 0.5;
  return Math.max(0, Math.min(100, value));
}

// Check if any NEW achievements are unlocked
export function checkAchievements(state: AppState): string[] {
  const { achievements, day, dayHistory } = state;
  const unlocked: string[] = [];
  const now = Date.now();

  // Helper to check if already unlocked
  const isUnlocked = (id: string) => !!achievements.unlockedAchievements[id];

  // 1. First Stand
  if (!isUnlocked('first_stand') && (day.standCount > 0 || day.standWorkCount > 0)) {
    unlocked.push('first_stand');
  }

  // 2. Streaks
  const currentStreak = achievements.streakDays;
  if (!isUnlocked('streak_3') && currentStreak >= 3) unlocked.push('streak_3');
  if (!isUnlocked('streak_7') && currentStreak >= 7) unlocked.push('streak_7');
  if (!isUnlocked('streak_30') && currentStreak >= 30) unlocked.push('streak_30');
  if (!isUnlocked('streak_100') && currentStreak >= 100) unlocked.push('streak_100');

  // 3. Daily Counts
  const totalStand = day.standCount + day.standWorkCount;
  if (!isUnlocked('daily_10') && totalStand >= 10) unlocked.push('daily_10');
  if (!isUnlocked('daily_20') && totalStand >= 20) unlocked.push('daily_20');

  // 4. Durations
  const totalStandMinutes = (day.totalStandMs + day.totalStandWorkMs) / 60000;
  if (!isUnlocked('stand_hour') && totalStandMinutes >= 60) unlocked.push('stand_hour');
  
  const totalStandWorkMinutes = day.totalStandWorkMs / 60000;
  if (!isUnlocked('stand_work_hour') && totalStandWorkMinutes >= 60) unlocked.push('stand_work_hour');

  // 5. No Excuse
  // Condition: Met daily goal AND no excuses
  if (!isUnlocked('no_excuse') && totalStand >= achievements.dailyGoal && day.excuseCount === 0) {
    unlocked.push('no_excuse');
  }

  // 6. Time based
  if ((!isUnlocked('early_bird') || !isUnlocked('night_owl')) && day.lastStandAt) {
    const lastStandDate = new Date(day.lastStandAt);
    const hour = lastStandDate.getHours();
    
    // Check if lastStandAt is today
    const todayStr = day.dayKey;
    const pad2 = (n: number) => n.toString().padStart(2, '0');
    const lastStandDayKey = `${lastStandDate.getFullYear()}-${pad2(lastStandDate.getMonth() + 1)}-${pad2(lastStandDate.getDate())}`;

    if (todayStr === lastStandDayKey) {
        if (!isUnlocked('early_bird') && hour < 8) {
            unlocked.push('early_bird');
        }
        if (!isUnlocked('night_owl') && hour >= 22) {
            unlocked.push('night_owl');
        }
    }
  }

  // 7. Health Guard (7 days > 80)
  if (!isUnlocked('health_guard')) {
    const todayHealth = calculateHealthScore(day.totalSitMs, day.totalStandMs + day.totalStandWorkMs);
    
    const uniqueDays = new Map<string, { sit: number, stand: number }>();
    
    uniqueDays.set(day.dayKey, { sit: day.totalSitMs, stand: day.totalStandMs + day.totalStandWorkMs });
    
    for (const h of dayHistory) {
        if (!uniqueDays.has(h.dayKey)) {
            uniqueDays.set(h.dayKey, { sit: h.totalSitMs, stand: h.totalStandMs + h.totalStandWorkMs });
        }
    }
    
    if (uniqueDays.size >= 7) {
        const sortedKeys = Array.from(uniqueDays.keys()).sort().reverse().slice(0, 7);
        
        const allGood = sortedKeys.every(k => {
            const d = uniqueDays.get(k)!;
            return calculateHealthScore(d.sit, d.stand) >= 80;
        });

        if (allGood) {
            unlocked.push('health_guard');
        }
    }
  }

  return unlocked;
}
