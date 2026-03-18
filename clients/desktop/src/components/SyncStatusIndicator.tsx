import { useState, useEffect } from 'react';
import { getSyncStatus, onSyncStatusChange } from '../services/syncService';
import type { SyncStatus } from '../services/syncService';

const statusConfig: Record<SyncStatus, { color: string; icon: string; label: string; glow?: boolean; pulse?: boolean }> = {
  synced:  { color: '#00ff88', icon: '☁', label: 'Synced' },
  syncing: { color: '#4da6ff', icon: '⟳', label: 'Syncing…', pulse: true },
  error:   { color: '#ffaa00', icon: '⚠', label: 'Sync error', glow: true },
  offline: { color: 'rgba(255,255,255,0.28)', icon: '○', label: 'Offline' },
  idle:    { color: 'rgba(255,255,255,0.22)', icon: '●', label: 'Idle' },
};

export default function SyncStatusIndicator() {
  const [status, setStatus] = useState<SyncStatus>(getSyncStatus);

  useEffect(() => {
    const unsub = onSyncStatusChange(setStatus);
    return unsub;
  }, []);

  const cfg = statusConfig[status];

  return (
    <div
      title={cfg.label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 26,
        height: 26,
        borderRadius: 999,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        cursor: 'default',
        position: 'relative',
        flexShrink: 0,
      }}
    >
      {/* Dot indicator */}
      <span
        style={{
          display: 'block',
          width: 8,
          height: 8,
          borderRadius: 999,
          background: cfg.color,
          boxShadow: cfg.glow ? `0 0 6px ${cfg.color}` : 'none',
          animation: cfg.pulse ? 'syncPulse 1.2s ease-in-out infinite' : 'none',
        }}
      />
      <style>{`
        @keyframes syncPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.7); }
        }
      `}</style>
    </div>
  );
}
