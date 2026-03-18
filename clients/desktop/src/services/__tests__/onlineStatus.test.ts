import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('onlineStatus', () => {
  let getIsOnline: typeof import('../onlineStatus').getIsOnline;
  let onOnlineChange: typeof import('../onlineStatus').onOnlineChange;
  let isOnline: typeof import('../onlineStatus').isOnline;

  beforeEach(async () => {
    // Reset module state for each test
    vi.resetModules();
    // Default: online
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
    const mod = await import('../onlineStatus');
    getIsOnline = mod.getIsOnline;
    onOnlineChange = mod.onOnlineChange;
    isOnline = mod.isOnline;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initial state matches navigator.onLine (true)', () => {
    expect(getIsOnline()).toBe(true);
    expect(isOnline.value).toBe(true);
  });

  it('initial state matches navigator.onLine (false)', async () => {
    vi.resetModules();
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true });
    const mod = await import('../onlineStatus');
    expect(mod.getIsOnline()).toBe(false);
    expect(mod.isOnline.value).toBe(false);
  });

  it('updates to true on window "online" event', () => {
    // Force initial offline via dispatching offline first
    window.dispatchEvent(new Event('offline'));
    expect(getIsOnline()).toBe(false);

    window.dispatchEvent(new Event('online'));
    expect(getIsOnline()).toBe(true);
    expect(isOnline.value).toBe(true);
  });

  it('updates to false on window "offline" event', () => {
    expect(getIsOnline()).toBe(true);

    window.dispatchEvent(new Event('offline'));
    expect(getIsOnline()).toBe(false);
    expect(isOnline.value).toBe(false);
  });

  it('subscriber callback fires on state change', () => {
    const cb = vi.fn();
    onOnlineChange(cb);

    window.dispatchEvent(new Event('offline'));
    expect(cb).toHaveBeenCalledWith(false);

    window.dispatchEvent(new Event('online'));
    expect(cb).toHaveBeenCalledWith(true);

    expect(cb).toHaveBeenCalledTimes(2);
  });

  it('unsubscribe stops callback from firing', () => {
    const cb = vi.fn();
    const unsub = onOnlineChange(cb);

    window.dispatchEvent(new Event('offline'));
    expect(cb).toHaveBeenCalledTimes(1);

    unsub();

    window.dispatchEvent(new Event('online'));
    // Should NOT have been called again
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('multiple subscribers all receive events', () => {
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    onOnlineChange(cb1);
    onOnlineChange(cb2);

    window.dispatchEvent(new Event('offline'));
    expect(cb1).toHaveBeenCalledWith(false);
    expect(cb2).toHaveBeenCalledWith(false);
  });
});
