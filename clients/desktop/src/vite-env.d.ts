/// <reference types="vite/client" />

interface ElectronAPI {
  triggerPopup?: () => void;
  closePopup?: () => void;
  showNotification?: (title: string, body: string) => void;
  minimizeMain?: () => void;
  closeMain?: () => void;
  resizeMain?: (width: number, height: number) => void;
  saveImage?: (buffer: ArrayBuffer, filename: string) => Promise<{ success: boolean; path?: string }>;
  copyImageToClipboard?: (buffer: ArrayBuffer) => Promise<{ success: boolean }>;
  getIdleTime?: () => Promise<number>;
  getSystemBootTime?: () => Promise<number>;
  setLanguage?: (lang: string) => void;
  onSystemLock?: (callback: () => void) => () => void;
  onSystemUnlock?: (callback: () => void) => () => void;
  send?: (
    channel: 'checkin:stand_start' | 'checkin:stood' | 'checkin:excuse' | 'checkin:pause' | 'checkin:stand_work_start' | 'checkin:ignore',
    payload: unknown,
  ) => void;
  on?: (
    channel: 'checkin:stand_start' | 'checkin:stood' | 'checkin:excuse' | 'checkin:pause' | 'checkin:stand_work_start' | 'checkin:ignore',
    callback: (payload: unknown) => void,
  ) => () => void;
  getAutoLaunch?: () => Promise<boolean>;
  setAutoLaunch?: (enabled: boolean) => Promise<boolean>;
  aiGetApiKey?: () => Promise<string | null>;
  aiSetApiKey?: (apiKey: string) => Promise<boolean>;
  aiClearApiKey?: () => Promise<boolean>;
  getPersistedStateSync?: (name: string) => string | null;
  setPersistedStateSync?: (name: string, value: string) => void;
  removePersistedStateSync?: (name: string) => void;
  getPersistedState?: (name: string) => Promise<string | null>;
  setPersistedState?: (name: string, value: string) => Promise<void>;
  removePersistedState?: (name: string) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {}
