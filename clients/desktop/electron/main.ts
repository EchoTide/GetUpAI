import { app, BrowserWindow, ipcMain, Menu, nativeImage, screen, Tray, Notification, clipboard, dialog, powerMonitor, type Event } from 'electron';
import { copyFileSync, existsSync, mkdirSync, promises as fs, readFileSync, renameSync, rmSync, writeFileSync } from 'fs';
import os from 'os';
import { dirname, join } from 'path';
import { getLanguage, setLanguage, t } from './i18n';
import { getAutoLaunch, setAutoLaunch } from './autoLaunch';
import { clearAiApiKey, getAiApiKey, setAiApiKey } from './aiSecret';


export let mainWindow: BrowserWindow | null = null;
export let popupWindow: BrowserWindow | null = null;

const APP_ID = 'ai.getup.desktop';

let tray: Tray | null = null;
let isQuitting = false;

const appIconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#5CFFB8"/>
      <stop offset="1" stop-color="#40DCFF"/>
    </linearGradient>
  </defs>
  <circle cx="32" cy="32" r="28" fill="#0C0E14"/>
  <circle cx="32" cy="32" r="27" fill="none" stroke="url(#g)" stroke-width="3"/>
  <path d="M32 16 L32 38" fill="none" stroke="url(#g)" stroke-width="5" stroke-linecap="round"/>
  <path d="M24 24 L32 16 L40 24" fill="none" stroke="url(#g)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="32" cy="46" r="3" fill="#40DCFF"/>
</svg>
`.trim();

function findIconIcoPath() {
  const candidates = [
    join(process.resourcesPath, 'app.asar', 'build', 'icon.ico'),
    join(process.resourcesPath, 'build', 'icon.ico'),
    join(app.getAppPath(), 'build', 'icon.ico'),
    join(__dirname, '../build/icon.ico'),
  ];

  for (const p of candidates) {
    try {
      if (existsSync(p)) return p;
    } catch {
    }
  }
  return null;
}

function getNativeIcon(size: number) {
  const iconPath = findIconIcoPath();
  if (iconPath) {
    const img = nativeImage.createFromPath(iconPath);
    if (!img.isEmpty()) return img.resize({ width: size, height: size });
  }
  const dataUrl = `data:image/svg+xml;base64,${Buffer.from(appIconSvg, 'utf8').toString('base64')}`;
  const img = nativeImage.createFromDataURL(dataUrl);
  return img.resize({ width: size, height: size });
}

function persistedStatePath(name: string) {
  return join(app.getPath('userData'), 'persisted-state', `${encodeURIComponent(name)}.json`);
}

function persistedStateBackupPath(name: string) {
  return `${persistedStatePath(name)}.bak`;
}

function readPersistedStateSync(name: string) {
  const target = persistedStatePath(name);
  const backup = persistedStateBackupPath(name);
  try {
    return readFileSync(target, 'utf8');
  } catch {
    try {
      if (existsSync(backup)) {
        return readFileSync(backup, 'utf8');
      }
    } catch {
    }
    return null;
  }
}

function writePersistedStateSync(name: string, value: string) {
  const target = persistedStatePath(name);
  const temp = `${target}.tmp`;
  const backup = persistedStateBackupPath(name);
  mkdirSync(dirname(target), { recursive: true });
  try {
    writeFileSync(temp, value, 'utf8');
    if (existsSync(target)) {
      copyFileSync(target, backup);
      rmSync(target, { force: true });
    }
    renameSync(temp, target);
    rmSync(backup, { force: true });
  } catch (error) {
    try {
      if (!existsSync(target) && existsSync(backup)) {
        copyFileSync(backup, target);
      }
    } catch {
    }
    try {
      rmSync(temp, { force: true });
    } catch {
    }
    throw error;
  }
}

function removePersistedStateSync(name: string) {
  try {
    rmSync(persistedStatePath(name), { force: true });
  } catch {
  }
}

async function readPersistedState(name: string) {
  try {
    return readPersistedStateSync(name);
  } catch {
    return null;
  }
}

async function writePersistedState(name: string, value: string) {
  writePersistedStateSync(name, value);
}

async function removePersistedState(name: string) {
  removePersistedStateSync(name);
}

function showMainWindow() {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    showMainWindow();
  });
}

function createTray() {
  const isMac = process.platform === 'darwin';
  
  if (!tray) {
    const scaleFactor = Math.max(1, screen.getPrimaryDisplay().scaleFactor || 1);
    const baseSize = isMac ? 18 : 16;
    const maxSize = isMac ? 44 : 32;
    const traySize = Math.min(maxSize, Math.max(baseSize, Math.round(baseSize * scaleFactor)));
    const trayIcon = getNativeIcon(traySize);
    if (isMac) trayIcon.setTemplateImage(true);
    tray = new Tray(trayIcon);
    tray.setToolTip('GetUpAI');
    tray.on('click', () => showMainWindow());
    tray.on('double-click', () => showMainWindow());
  }

  const menu = Menu.buildFromTemplate([
    { label: t('tray.open'), click: () => showMainWindow() },
    {
      label: t('tray.quit'),
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(menu);
}

function createApplicationMenu() {
  const isMac = process.platform === 'darwin';

  const template: any[] = [
    {
      label: t('menu.file.label'),
      submenu: [
        { role: isMac ? 'close' : 'quit', label: t('menu.file.close') }
      ]
    },
    {
      label: t('menu.edit.label'),
      submenu: [
        { role: 'undo', label: t('menu.edit.undo') },
        { role: 'redo', label: t('menu.edit.redo') },
        { type: 'separator' },
        { role: 'cut', label: t('menu.edit.cut') },
        { role: 'copy', label: t('menu.edit.copy') },
        { role: 'paste', label: t('menu.edit.paste') },
        { role: 'selectAll', label: t('menu.edit.selectAll') },
      ]
    },
    {
      label: t('menu.view.label'),
      submenu: [
        { role: 'reload', label: t('menu.view.reload') },
        { role: 'forceReload', label: t('menu.view.forceReload') },
        { role: 'toggleDevTools', label: t('menu.view.toggleDevTools') },
        { type: 'separator' },
        { role: 'togglefullscreen', label: t('menu.view.toggleFullScreen') }
      ]
    },
    {
      label: t('menu.window.label'),
      submenu: [
        { role: 'minimize', label: t('menu.window.minimize') },
        { role: 'zoom', label: t('menu.window.zoom') },
        ...(isMac ? [
          { type: 'separator' },
          { role: 'front', label: t('menu.window.front') },
          { type: 'separator' },
          { role: 'window', label: t('menu.window.close') }
        ] : [
          { role: 'close', label: t('menu.window.close') }
        ])
      ]
    },
    {
      label: t('menu.help.label'),
      submenu: [
        {
          label: t('menu.help.learnMore'),
          click: async () => {
            const { shell } = await import('electron');
            await shell.openExternal('https://github.com/GetUpAI/GetUpAI');
          }
        }
      ]
    }
  ];

  if (isMac) {
    template.unshift({
      label: app.name,
      submenu: [
        { role: 'about', label: t('menu.app.about') },
        { type: 'separator' },
        { role: 'services', label: t('menu.app.services') },
        { type: 'separator' },
        { role: 'hide', label: t('menu.app.hide') },
        { role: 'hideOthers', label: t('menu.app.hideOthers') },
        { role: 'unhide', label: t('menu.app.showAll') },
        { type: 'separator' },
        { role: 'quit', label: t('menu.app.quit') }
      ]
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 980,
    height: 750,
    minWidth: 760,
    minHeight: 560,
    resizable: true,
    backgroundColor: '#121212',
    titleBarStyle: 'hidden',
    icon: getNativeIcon(64),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js'),
    },
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.on('close', (e: Event) => {
    if (isQuitting) return;
    e.preventDefault();
    mainWindow?.hide();
    createTray();
  });

  mainWindow.on('minimize', (e: Event) => {
    if (process.platform !== 'win32') return;
    e.preventDefault();
    mainWindow?.hide();
    createTray();
  });

  const devUrl = 'http://localhost:5173';
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'));
  }
}

function createPopupWindow() {
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const { x, y, width, height } = display.workArea;
  const devUrl = 'http://localhost:5173';
  
  popupWindow = new BrowserWindow({
    width,
    height,
    x,
    y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: '#00000000',
    icon: getNativeIcon(64),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js'),
    },
  });

  popupWindow.setAlwaysOnTop(true, 'screen-saver');
  popupWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  popupWindow.on('closed', () => {
    popupWindow = null;
  });

  if (process.env.NODE_ENV === 'development') {
    popupWindow.loadURL(`${devUrl}#/popup`);
  } else {
    popupWindow.loadFile(join(__dirname, '../dist/index.html'), { hash: 'popup' });
  }
}

app.setAsDefaultProtocolClient('getupai');

app.whenReady().then(() => {
  if (process.platform === 'win32') {
    app.setAppUserModelId(APP_ID);
  }

  if (!gotSingleInstanceLock) return;

  const locale = app.getLocale();
  setLanguage(locale);

  createMainWindow();
  createTray();
  createApplicationMenu();

  ipcMain.on('set-language', (_event, lang) => {
    if (typeof lang === 'string') {
      const oldLang = getLanguage();
      setLanguage(lang);
      if (getLanguage() !== oldLang) {
        createTray();
        createApplicationMenu();
      }
    }
  });

  ipcMain.on('trigger-popup', () => {
    if (!popupWindow) {
      createPopupWindow();
    } else {
      popupWindow.show();
      popupWindow.focus();
    }
  });

  ipcMain.on('show-notification', (_event, payload) => {
    const title = typeof payload?.title === 'string' ? payload.title : t('notification.defaultTitle');
    const body = typeof payload?.body === 'string' ? payload.body : '';
    new Notification({ title, body }).show();
  });

  ipcMain.on('close-popup', () => {
    if (popupWindow) {
      popupWindow.close();
      popupWindow = null;
    }
  });

  ipcMain.handle('persisted-state:get', async (_event, name) => {
    if (typeof name !== 'string' || !name.trim()) return null;
    return readPersistedState(name);
  });

  ipcMain.on('persisted-state:get-sync', (event, name) => {
    if (typeof name !== 'string' || !name.trim()) {
      event.returnValue = null;
      return;
    }
    event.returnValue = readPersistedStateSync(name);
  });

  ipcMain.handle('persisted-state:set', async (_event, payload) => {
    const name = typeof payload?.name === 'string' ? payload.name : '';
    const value = typeof payload?.value === 'string' ? payload.value : '';
    if (!name.trim()) return;
    try {
      await writePersistedState(name, value);
    } catch (error) {
      console.error('persisted-state:set failed', error);
    }
  });

  ipcMain.on('persisted-state:set-sync', (event, payload) => {
    const name = typeof payload?.name === 'string' ? payload.name : '';
    const value = typeof payload?.value === 'string' ? payload.value : '';
    if (name.trim()) {
      try {
        writePersistedStateSync(name, value);
      } catch (error) {
        console.error('persisted-state:set-sync failed', error);
      }
    }
    event.returnValue = null;
  });

  ipcMain.handle('persisted-state:remove', async (_event, name) => {
    if (typeof name !== 'string' || !name.trim()) return;
    await removePersistedState(name);
  });

  ipcMain.on('persisted-state:remove-sync', (event, name) => {
    if (typeof name === 'string' && name.trim()) {
      removePersistedStateSync(name);
    }
    event.returnValue = null;
  });

  ipcMain.on('checkin:stood', (_event, payload) => {
    if (mainWindow) mainWindow.webContents.send('checkin:stood', payload);
    if (popupWindow) {
      popupWindow.close();
      popupWindow = null;
    }
  });

  ipcMain.on('checkin:excuse', (_event, payload) => {
    if (mainWindow) mainWindow.webContents.send('checkin:excuse', payload);
  });

  ipcMain.on('checkin:pause', (_event, payload) => {
    if (mainWindow) mainWindow.webContents.send('checkin:pause', payload);
    if (popupWindow) {
      popupWindow.close();
      popupWindow = null;
    }
  });

  ipcMain.on('checkin:ignore', (_event, payload) => {
    if (mainWindow) mainWindow.webContents.send('checkin:ignore', payload);
    if (popupWindow) {
      popupWindow.close();
      popupWindow = null;
    }
  });

  ipcMain.on('checkin:stand_work_start', (_event, payload) => {
    if (mainWindow) mainWindow.webContents.send('checkin:stand_work_start', payload);
    if (popupWindow) {
      popupWindow.close();
      popupWindow = null;
    }
  });

  ipcMain.on('window:minimize', () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.on('window:close', () => {
    if (mainWindow) mainWindow.close();
  });

  ipcMain.on('window:resize', (_event, { width, height }) => {
    if (mainWindow) mainWindow.setSize(width, height);
  });


  ipcMain.handle('save-image', async (_event, { buffer, filename }) => {
    const { filePath } = await dialog.showSaveDialog({
      defaultPath: filename,
      filters: [{ name: t('dialog.imageFilterName'), extensions: ['png'] }],
    });
    if (filePath) {
      await fs.writeFile(filePath, Buffer.from(buffer));
      return { success: true, path: filePath };
    }
    return { success: false };
  });

  ipcMain.handle('copy-image', async (_event, { buffer }) => {
    const image = nativeImage.createFromBuffer(Buffer.from(buffer));
    clipboard.writeImage(image);
    return { success: true };
  });

  powerMonitor.on('lock-screen', () => {
    if (mainWindow) mainWindow.webContents.send('system:lock');
  });

  powerMonitor.on('unlock-screen', () => {
    if (mainWindow) mainWindow.webContents.send('system:unlock');
  });

  ipcMain.handle('get-idle-time', () => {
    return powerMonitor.getSystemIdleTime();
  });

  ipcMain.handle('get-system-boot-time', () => {
    return Date.now() - os.uptime() * 1000;
  });

  ipcMain.handle('auto-launch:get', () => {
    return getAutoLaunch();
  });

  ipcMain.handle('auto-launch:set', (_event, enabled: boolean) => {
    setAutoLaunch(enabled);
    return { ok: true };
  });

  ipcMain.handle('ai:get-api-key', async () => {
    return await getAiApiKey();
  });

  ipcMain.handle('ai:set-api-key', async (_event, apiKey: string) => {
    if (typeof apiKey !== 'string') return false;
    return await setAiApiKey(apiKey);
  });

  ipcMain.handle('ai:clear-api-key', async () => {
    return await clearAiApiKey();
  });

});


app.on('window-all-closed', () => {
  if (process.platform === 'darwin') return;
  if (isQuitting) app.quit();
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('activate', () => {
  if (mainWindow) {
    showMainWindow();
  } else {
    createMainWindow();
  }
});
