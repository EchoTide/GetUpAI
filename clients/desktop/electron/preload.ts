import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  triggerPopup: () => ipcRenderer.send('trigger-popup'),
  closePopup: () => ipcRenderer.send('close-popup'),
  showNotification: (title: string, body: string) => ipcRenderer.send('show-notification', { title, body }),
  minimizeMain: () => ipcRenderer.send('window:minimize'),
  closeMain: () => ipcRenderer.send('window:close'),
  resizeMain: (width: number, height: number) => ipcRenderer.send('window:resize', { width, height }),
  saveImage: (buffer: ArrayBuffer, filename: string) => ipcRenderer.invoke('save-image', { buffer, filename }),
  copyImageToClipboard: (buffer: ArrayBuffer) => ipcRenderer.invoke('copy-image', { buffer }),
  send: (
    channel: 'checkin:stand_start' | 'checkin:stood' | 'checkin:excuse' | 'checkin:pause' | 'checkin:stand_work_start' | 'checkin:ignore',
    payload: unknown,
  ) => {
    if (
      channel === 'checkin:stand_start' ||
      channel === 'checkin:stood' ||
      channel === 'checkin:excuse' ||
      channel === 'checkin:pause' ||
      channel === 'checkin:stand_work_start' ||
      channel === 'checkin:ignore'
    ) {
      ipcRenderer.send(channel, payload);
    }
  },
  on: (
    channel: 'checkin:stand_start' | 'checkin:stood' | 'checkin:excuse' | 'checkin:pause' | 'checkin:stand_work_start' | 'checkin:ignore',
    callback: (payload: unknown) => void,
  ) => {
    if (
      channel === 'checkin:stand_start' ||
      channel === 'checkin:stood' ||
      channel === 'checkin:excuse' ||
      channel === 'checkin:pause' ||
      channel === 'checkin:stand_work_start' ||
      channel === 'checkin:ignore'
    ) {
      const listener = (_event: unknown, payload: unknown) => callback(payload);
      ipcRenderer.on(channel, listener);
      return () => ipcRenderer.removeListener(channel, listener);
    }
    return () => {};
  },
  getIdleTime: () => ipcRenderer.invoke('get-idle-time'),
  getSystemBootTime: () => ipcRenderer.invoke('get-system-boot-time'),
  getAutoLaunch: () => ipcRenderer.invoke('auto-launch:get'),
  setAutoLaunch: (enabled: boolean) => ipcRenderer.invoke('auto-launch:set', enabled),
  aiGetApiKey: () => ipcRenderer.invoke('ai:get-api-key'),
  aiSetApiKey: (apiKey: string) => ipcRenderer.invoke('ai:set-api-key', apiKey),
  aiClearApiKey: () => ipcRenderer.invoke('ai:clear-api-key'),
  getPersistedStateSync: (name: string) => ipcRenderer.sendSync('persisted-state:get-sync', name),
  setPersistedStateSync: (name: string, value: string) => ipcRenderer.sendSync('persisted-state:set-sync', { name, value }),
  removePersistedStateSync: (name: string) => ipcRenderer.sendSync('persisted-state:remove-sync', name),
  getPersistedState: (name: string) => ipcRenderer.invoke('persisted-state:get', name),
  setPersistedState: (name: string, value: string) => ipcRenderer.invoke('persisted-state:set', { name, value }),
  removePersistedState: (name: string) => ipcRenderer.invoke('persisted-state:remove', name),
  setLanguage: (lang: string) => ipcRenderer.send('set-language', lang),
  onSystemLock: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('system:lock', listener);
    return () => ipcRenderer.removeListener('system:lock', listener);
  },
  onSystemUnlock: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('system:unlock', listener);
    return () => ipcRenderer.removeListener('system:unlock', listener);
  },
});
