import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

const WINDOWS_RUN_KEY = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';
const WINDOWS_RUN_VALUE = 'GetUpAI';
const WINDOWS_LEGACY_RUN_VALUE = 'ai.getup.desktop';
const WINDOWS_ELECTRON_RUN_VALUE = 'electron.app.GetUpAI';

/**
 * Get the autostart desktop file path for Linux
 */
function getLinuxDesktopFilePath(): string {
  const configDir = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
  return path.join(configDir, 'autostart', 'GetUpAI.desktop');
}

/**
 * Check if the app is set to launch at login.
 * Returns false in development mode or non-supported platforms.
 */
export function getAutoLaunch(): boolean {
  // Windows implementation
  if (process.platform === 'win32') {
    if (!app.isPackaged) {
      return false;
    }
    try {
      execSync(`reg query "${WINDOWS_RUN_KEY}" /v "${WINDOWS_RUN_VALUE}"`, { encoding: 'utf-8', windowsHide: true });
      return true;
    } catch {}
    try {
      execSync(`reg query "${WINDOWS_RUN_KEY}" /v "${WINDOWS_ELECTRON_RUN_VALUE}"`, { encoding: 'utf-8', windowsHide: true });
      return true;
    } catch {}
    try {
      execSync(`reg query "${WINDOWS_RUN_KEY}" /v "${WINDOWS_LEGACY_RUN_VALUE}"`, { encoding: 'utf-8', windowsHide: true });
      return true;
    } catch {}
    return false;
  }

  // Linux implementation using XDG autostart
  if (process.platform === 'linux') {
    if (!app.isPackaged) {
      return false;
    }
    const desktopFilePath = getLinuxDesktopFilePath();
    return fs.existsSync(desktopFilePath);
  }

  // macOS implementation
  if (process.platform === 'darwin') {
    if (!app.isPackaged) {
      return false;
    }
    const settings = app.getLoginItemSettings();
    return settings.openAtLogin;
  }

  return false;
}

/**
 * Enable or disable auto-launch at login.
 * No-op in development mode or non-supported platforms.
 */
export function setAutoLaunch(enabled: boolean): void {
  // Windows implementation
  if (process.platform === 'win32') {
    if (!app.isPackaged) {
      return;
    }
    if (enabled) {
      execSync(`reg add "${WINDOWS_RUN_KEY}" /v "${WINDOWS_RUN_VALUE}" /t REG_SZ /d "${process.execPath}" /f`, {
        encoding: 'utf-8',
        windowsHide: true,
      });
    } else {
      try {
        execSync(`reg delete "${WINDOWS_RUN_KEY}" /v "${WINDOWS_RUN_VALUE}" /f`, {
          encoding: 'utf-8',
          windowsHide: true,
        });
      } catch {
        // already removed
      }
      try {
        execSync(`reg delete "${WINDOWS_RUN_KEY}" /v "${WINDOWS_LEGACY_RUN_VALUE}" /f`, {
          encoding: 'utf-8',
          windowsHide: true,
        });
      } catch {
        // already removed
      }
      try {
        execSync(`reg delete "${WINDOWS_RUN_KEY}" /v "${WINDOWS_ELECTRON_RUN_VALUE}" /f`, {
          encoding: 'utf-8',
          windowsHide: true,
        });
      } catch {
        // already removed
      }
      try {
        app.setLoginItemSettings({ openAtLogin: false });
      } catch {}
    }
    return;
  }

  // Linux implementation using XDG autostart
  if (process.platform === 'linux') {
    if (!app.isPackaged) {
      return;
    }
    const desktopFilePath = getLinuxDesktopFilePath();
    const configDir = path.dirname(desktopFilePath);

    if (enabled) {
      // Ensure autostart directory exists
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      // Write .desktop file
      const desktopContent = `[Desktop Entry]
Type=Application
Name=GetUpAI
Exec=${process.execPath}
Hidden=false
X-GNOME-Autostart-enabled=true
`;
      fs.writeFileSync(desktopFilePath, desktopContent);
    } else {
      // Remove .desktop file if it exists
      if (fs.existsSync(desktopFilePath)) {
        fs.unlinkSync(desktopFilePath);
      }
    }
    return;
  }

  // macOS implementation
  if (process.platform === 'darwin') {
    if (!app.isPackaged) {
      return;
    }
    app.setLoginItemSettings({
      openAtLogin: enabled,
    });
    return;
  }
}
