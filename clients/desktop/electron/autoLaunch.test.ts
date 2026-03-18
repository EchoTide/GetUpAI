import { beforeEach, describe, expect, it, vi } from 'vitest';

const { execSyncMock } = vi.hoisted(() => ({
  execSyncMock: vi.fn(),
}));

vi.mock('electron', () => ({
  app: {
    isPackaged: true,
    getLoginItemSettings: vi.fn(),
    setLoginItemSettings: vi.fn(),
  },
}));

vi.mock('child_process', () => ({
  execSync: execSyncMock,
  default: {
    execSync: execSyncMock,
  },
}));

import { app } from 'electron';
import { getAutoLaunch, setAutoLaunch } from './autoLaunch';

describe('autoLaunch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    execSyncMock.mockReset();
    execSyncMock.mockReturnValue('' as any);
    Object.defineProperty(process, 'platform', {
      value: 'win32',
      configurable: true,
    });
    (app as any).isPackaged = true;
  });

  describe('getAutoLaunch - Windows', () => {
    it('returns true when run key exists', () => {
      execSyncMock.mockReturnValue('GetUpAI' as any);
      expect(getAutoLaunch()).toBe(true);
    });

    it('returns false when run key does not exist', () => {
      execSyncMock.mockImplementation(() => {
        throw new Error('not found');
      });
      expect(getAutoLaunch()).toBe(false);
    });

    it('returns false in dev mode', () => {
      (app as any).isPackaged = false;
      expect(getAutoLaunch()).toBe(false);
      expect(execSyncMock).not.toHaveBeenCalled();
    });
  });

  describe('setAutoLaunch - Windows', () => {
    it('writes run key when enabling', () => {
      setAutoLaunch(true);
      expect(execSyncMock).toHaveBeenCalled();
      expect(String(execSyncMock.mock.calls[0]?.[0] ?? '')).toContain('reg add');
    });

    it('deletes run key when disabling', () => {
      setAutoLaunch(false);
      expect(execSyncMock).toHaveBeenCalled();
      expect(String(execSyncMock.mock.calls[0]?.[0] ?? '')).toContain('reg delete');
    });

    it('does nothing in dev mode', () => {
      (app as any).isPackaged = false;
      setAutoLaunch(true);
      expect(execSyncMock).not.toHaveBeenCalled();
    });
  });
});
