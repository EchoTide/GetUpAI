/**
 * Reactive online/offline status tracker.
 * Uses navigator.onLine + window events for real-time updates.
 */

type OnlineChangeCallback = (isOnline: boolean) => void;

const subscribers = new Set<OnlineChangeCallback>();

let currentStatus = typeof navigator !== 'undefined' ? navigator.onLine : true;

function handleOnline() {
  currentStatus = true;
  for (const cb of subscribers) cb(true);
}

function handleOffline() {
  currentStatus = false;
  for (const cb of subscribers) cb(false);
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
}

/** Current online status (imperative read). */
export function getIsOnline(): boolean {
  return currentStatus;
}

/** Subscribe to online/offline changes. Returns unsubscribe function. */
export function onOnlineChange(callback: OnlineChangeCallback): () => void {
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
}

/** Reactive boolean for use in components (read via getIsOnline). */
export const isOnline = {
  get value() {
    return currentStatus;
  },
};
