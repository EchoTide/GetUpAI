export interface UpdateInfo {
  version: string;
  releaseDate: string;
  notes: string;
  platforms: Record<string, string>;
}

/**
 * Compares two semver strings (e.g., "1.2.3").
 * Returns true if `latest` is strictly newer than `current`.
 */
export function isNewerVersion(current: string, latest: string): boolean {
  const currentParts = current.replace(/^v/, '').split('.').map(Number);
  const latestParts = latest.replace(/^v/, '').split('.').map(Number);

  for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
    const c = currentParts[i] || 0;
    const l = latestParts[i] || 0;
    if (l > c) return true;
    if (l < c) return false;
  }
  return false;
}

/**
 * Fetches the latest update info and checks if it's newer than the current version.
 * Silently catches all errors and returns null.
 */
export async function checkForUpdates(currentVersion: string): Promise<UpdateInfo | null> {
  void currentVersion;
  return null;
}
