import { describe, it, expect } from 'vitest';
import en from './en.json';
import zh from './zh.json';

describe('i18n auto-start keys', () => {
  it('en.json should have auto_start settings', () => {
    // @ts-ignore
    expect(en.settings.auto_start).toBe('Launch at Startup');
    // @ts-ignore
    expect(en.settings.auto_start_description).toBe('Automatically start GetUpAI when you log in');
  });

  it('zh.json should have auto_start settings', () => {
    // @ts-ignore
    expect(zh.settings.auto_start).toBe('开机自启动');
    // @ts-ignore
    expect(zh.settings.auto_start_description).toBe('登录电脑时自动启动 GetUpAI');
  });

  it('includes popup start action labels used by PopupPage', () => {
    // @ts-ignore
    expect(en.actions.start_now).toBe('Start Now');
    // @ts-ignore
    expect(zh.actions.start_now).toBe('立即开始');
  });
});
