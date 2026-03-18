import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getIsOnline, onOnlineChange } from '../services/onlineStatus';

export default function OfflineBanner() {
  const { t } = useTranslation();
  const [isOnline, setIsOnline] = useState(getIsOnline);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const unsub = onOnlineChange((online) => {
      setIsOnline(online);
      // Reset dismissed when transitioning back to offline
      if (!online) setDismissed(false);
    });
    return unsub;
  }, []);

  if (isOnline || dismissed) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        padding: '8px 14px',
        borderRadius: 10,
        background: 'rgba(255,165,0,0.12)',
        border: '1px solid rgba(255,165,0,0.18)',
        marginBottom: 8,
        fontSize: 12,
        color: 'rgba(255,255,255,0.72)',
        fontWeight: 500,
        lineHeight: 1.4,
        ...({ WebkitAppRegion: 'no-drag' } as any),
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 14 }}>⚡</span>
        {t('offline_banner.message')}
      </span>
      <button
        onClick={() => setDismissed(true)}
        title={t('offline_banner.dismiss')}
        style={{
          background: 'none',
          border: 'none',
          color: 'rgba(255,255,255,0.45)',
          cursor: 'pointer',
          fontSize: 16,
          lineHeight: 1,
          padding: '2px 4px',
          borderRadius: 4,
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}
