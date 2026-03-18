import React, { useEffect, useState } from 'react';
import { HashRouter, Route, Routes, Navigate } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import PopupPage from './pages/PopupPage';
import { useAppStore } from './store/useAppStore';
import { checkForUpdates, UpdateInfo } from './services/updateService';
import { UpdateNotification } from './components/UpdateNotification';
import packageJson from '../package.json';

const App = () => {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [showUpdateNotification, setShowUpdateNotification] = useState(false);

  // Check for updates on mount
  useEffect(() => {
    const check = async () => {
      const currentVersion = packageJson.version;
      const info = await checkForUpdates(currentVersion);
      if (info) {
        const { shouldShowUpdate } = useAppStore.getState();
        if (shouldShowUpdate(info.version, currentVersion)) {
          setUpdateInfo(info);
          setShowUpdateNotification(true);
        }
      }
    };
    check();
  }, []);

  const handleDownloadUpdate = () => {
    if (!updateInfo) return;
    
    let downloadUrl = Object.values(updateInfo.platforms)[0] || 'https://github.com';
    const plat = navigator.platform.toLowerCase();
    if (plat.includes('win') && updateInfo.platforms['windows']) {
      downloadUrl = updateInfo.platforms['windows'];
    } else if (plat.includes('mac') && updateInfo.platforms['macos']) {
      downloadUrl = updateInfo.platforms['macos'];
    } else if (plat.includes('linux') && updateInfo.platforms['linux']) {
      downloadUrl = updateInfo.platforms['linux'];
    }

    if (window.electronAPI && (window.electronAPI as any).openExternal) {
      (window.electronAPI as any).openExternal(downloadUrl);
    } else {
      window.open(downloadUrl, '_blank');
    }
    setShowUpdateNotification(false);
  };

  const handleSkipUpdate = () => {
    if (updateInfo) {
      useAppStore.getState().skipVersion(updateInfo.version);
    }
    setShowUpdateNotification(false);
  };

  const handleRemindLaterUpdate = () => {
    useAppStore.getState().remindLater(24);
    setShowUpdateNotification(false);
  };

  return (
    <HashRouter>
      {showUpdateNotification && updateInfo && (
        <UpdateNotification
          updateInfo={updateInfo}
          onDownload={handleDownloadUpdate}
          onSkip={handleSkipUpdate}
          onRemindLater={handleRemindLaterUpdate}
        />
      )}
      <Routes>
        <Route path="/popup" element={<PopupPage />} />
        <Route path="/" element={<DashboardPage />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/admin" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
