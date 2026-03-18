import { describe, it, expect } from 'vitest';
import { ACHIEVEMENTS, checkAchievements } from './achievements';
import { AppState } from '../store/useAppStore';

// Mock translation keys to verify structure
const mockEn = {
  achievements: {
    items: {
      first_stand: { name: 'First Awakening', desc: 'Complete your first stand-up' },
      streak_3: { name: 'Habit Forming', desc: 'Complete stand-ups for 3 consecutive days' },
      // ... assume others exist
    }
  }
};

describe('Achievements', () => {
  it('should have valid translation keys for all achievements', () => {
    ACHIEVEMENTS.forEach(achievement => {
      expect(achievement.name).toMatch(/^achievements\.items\.[a-z0-9_]+\.name$/);
      expect(achievement.description).toMatch(/^achievements\.items\.[a-z0-9_]+\.desc$/);
      
      // Ensure the ID in the key matches the achievement ID
      const nameId = achievement.name.split('.')[2];
      const descId = achievement.description.split('.')[2];
      expect(nameId).toBe(achievement.id);
      expect(descId).toBe(achievement.id);
    });
  });

  it('checkAchievements should unlock first_stand when standing', () => {
    const mockState = {
      achievements: {
        unlockedAchievements: {},
        streakDays: 0,
        lastStreakDate: null,
        dailyGoal: 6,
      },
      day: {
        standCount: 1,
        standWorkCount: 0,
        totalStandMs: 0,
        totalStandWorkMs: 0,
        totalSitMs: 0,
        excuseCount: 0,
        ignoreCount: 0,
        dayKey: '2023-01-01',
        lastStandAt: null,
      },
      dayHistory: [],
    } as unknown as AppState;

    const unlocked = checkAchievements(mockState);
    expect(unlocked).toContain('first_stand');
  });

  it('checkAchievements should not unlock anything if conditions not met', () => {
    const mockState = {
      achievements: {
        unlockedAchievements: {},
        streakDays: 0,
        lastStreakDate: null,
        dailyGoal: 6,
      },
      day: {
        standCount: 0,
        standWorkCount: 0,
        totalStandMs: 0,
        totalStandWorkMs: 0,
        totalSitMs: 0,
        excuseCount: 0,
        ignoreCount: 0,
        dayKey: '2023-01-01',
        lastStandAt: null,
      },
      dayHistory: [],
    } as unknown as AppState;

    const unlocked = checkAchievements(mockState);
    expect(unlocked).toHaveLength(0);
  });
});
