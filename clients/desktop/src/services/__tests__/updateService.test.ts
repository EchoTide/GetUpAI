import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { checkForUpdates, isNewerVersion } from '../updateService';

describe('updateService', () => {
  describe('isNewerVersion', () => {
    it('should return true for a newer major version', () => {
      expect(isNewerVersion('1.0.0', '2.0.0')).toBe(true);
    });

    it('should return true for a newer minor version', () => {
      expect(isNewerVersion('1.1.0', '1.2.0')).toBe(true);
    });

    it('should return true for a newer patch version', () => {
      expect(isNewerVersion('1.1.1', '1.1.2')).toBe(true);
    });

    it('should return false for the same version', () => {
      expect(isNewerVersion('1.1.1', '1.1.1')).toBe(false);
    });

    it('should return false for an older version', () => {
      expect(isNewerVersion('2.0.0', '1.9.9')).toBe(false);
    });

    it('handles v prefix gracefully', () => {
      expect(isNewerVersion('v1.0.0', 'v1.0.1')).toBe(true);
      expect(isNewerVersion('1.0.0', 'v1.0.1')).toBe(true);
    });
  });

  describe('checkForUpdates', () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
      global.fetch = vi.fn();
    });

    afterEach(() => {
      global.fetch = originalFetch;
      vi.restoreAllMocks();
    });

    it('returns null immediately in local-only mode without fetching', async () => {
      const result = await checkForUpdates('1.0.0');

      expect(result).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('keeps returning null even when fetch is mocked', async () => {
      (global.fetch as any).mockResolvedValue({ ok: true, json: async () => ({ version: '99.0.0' }) });

      const result = await checkForUpdates('1.0.0');

      expect(result).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});
