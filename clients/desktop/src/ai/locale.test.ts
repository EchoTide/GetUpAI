import { generatePrompt } from '@getup-ai/shared-logic';
import { buildMomentA, buildMomentB, buildMomentC, buildMomentD } from './prompts';
import { AiBaseContext, AiUserContext } from './aiContext';
import { describe, test, expect } from 'vitest';

describe('AI Locale Consistency', () => {
  const baseContext: AiBaseContext = {
    now: Date.now(),
    appName: 'GetUpAI',
    mission: 'Spine Health',
    personality: 'gentle',
    locale: 'en',
  };

  const userContext: AiUserContext = {
    mode: 'work',
    sitMinutes: 60,
    standCount: 2,
    ignoreCount: 0,
    excuseCount: 0,
    standWorkMinutes: 0,
  };

  test('prompts.ts generates English for EN locale', () => {
    const momentA = buildMomentA(baseContext, userContext);
    expect(momentA[1].content).toContain('Moment A: Dynamic Urge');
    expect(momentA[1].content).not.toContain('瞬间 A');

    const momentB = buildMomentB(baseContext, userContext, 'tired');
    expect(momentB[1].content).toContain('Moment B: Excuse Review');
    expect(momentB[1].content).not.toContain('瞬间 B');

    const momentC = buildMomentC(baseContext, userContext, 'Daily Facts');
    expect(momentC[1].content).toContain('Moment C: Stand Analysis Report');
    expect(momentC[1].content).not.toContain('瞬间 C');

    const momentD = buildMomentD(baseContext, { sitMinutes: 60, standMinutes: 5 });
    expect(momentD[1].content).toContain('Moment D: Stand Exercise Guide');
    expect(momentD[1].content).not.toContain('瞬间 D');
  });

  test('generatePrompt generates English for EN locale', () => {
    const prompt = generatePrompt('mean_hr', 60, 'tired', 1, 'en');
    // It should contain English
    expect(prompt).toContain('You are a cold, performance-obsessed HR');
    expect(prompt).not.toContain('你是一个冷漠、刻薄的HR');
    expect(prompt).toContain('Current Situation:');
    expect(prompt).not.toContain('当前情况：');
    expect(prompt).toContain('Rage Level: Level 1');
    expect(prompt).not.toContain('愤怒等级：Level 1');
  });
});
