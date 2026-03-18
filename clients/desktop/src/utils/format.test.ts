import { describe, it, expect } from 'vitest';
import { formatRelativeTime, formatDurationShort, formatHMS } from './format';
import i18n from '../i18n';

describe('format utilities', () => {
  describe('formatHMS', () => {
    it('should format seconds into HH:MM:SS', () => {
      expect(formatHMS(3661)).toBe('01:01:01');
      expect(formatHMS(61)).toBe('01:01');
      expect(formatHMS(5)).toBe('00:05');
    });
  });

  describe('formatDurationShort', () => {
    it('should format ms into short duration string and localize', async () => {
      await i18n.changeLanguage('en');
      expect(formatDurationShort(3661000)).toBe('1h 1m');
      expect(formatDurationShort(61000)).toBe('1m 1s');
      expect(formatDurationShort(5000)).toBe('5s');

      await i18n.changeLanguage('zh');
      expect(formatDurationShort(3661000)).toBe('1h 1m');
    });
  });

  describe('formatRelativeTime', () => {
    const now = 1700000000000;

    it('should return localization for "just now"', async () => {
      await i18n.changeLanguage('en');
      expect(formatRelativeTime(now, now - 30000)).toBe('just now');
      
      await i18n.changeLanguage('zh');
      expect(formatRelativeTime(now, now - 30000)).toBe('刚刚');
    });

    it('should return localization for minutes ago', async () => {
      await i18n.changeLanguage('en');
      expect(formatRelativeTime(now, now - 5 * 60000)).toBe('5m ago');
      
      await i18n.changeLanguage('zh');
      expect(formatRelativeTime(now, now - 5 * 60000)).toBe('5分钟前');
    });

    it('should return localization for hours ago', async () => {
      await i18n.changeLanguage('en');
      expect(formatRelativeTime(now, now - 2 * 3600000)).toBe('2h ago');
      
      await i18n.changeLanguage('zh');
      expect(formatRelativeTime(now, now - 2 * 3600000)).toBe('2小时前');
    });

    it('should return localization for days ago', async () => {
      await i18n.changeLanguage('en');
      expect(formatRelativeTime(now, now - 3 * 86400000)).toBe('3d ago');
      
      await i18n.changeLanguage('zh');
      expect(formatRelativeTime(now, now - 3 * 86400000)).toBe('3天前');
    });

    it('should return "—" if then is null', () => {
      expect(formatRelativeTime(now, null)).toBe('—');
    });

    it('should handle future time or zero diff as "just now"', async () => {
      await i18n.changeLanguage('en');
      expect(formatRelativeTime(now, now + 1000)).toBe('just now');
      expect(formatRelativeTime(now, now)).toBe('just now');
    });

    it('should handle exactly 1 hour', async () => {
      await i18n.changeLanguage('en');
      expect(formatRelativeTime(now, now - 60 * 60000)).toBe('1h ago');
    });

    it('should handle exactly 1 day', async () => {
      await i18n.changeLanguage('en');
      expect(formatRelativeTime(now, now - 24 * 3600000)).toBe('1d ago');
    });
  });
});
