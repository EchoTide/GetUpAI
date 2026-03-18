import React from 'react';
import { useTranslation } from 'react-i18next';
import { ACHIEVEMENTS, AchievementState } from '../utils/achievements';

interface AchievementModalProps {
  open: boolean;
  onClose: () => void;
  achievements: AchievementState;
}

export function AchievementModal({ open, onClose, achievements }: AchievementModalProps) {
  const { t } = useTranslation();
  if (!open) return null;

  const unlockedIds = new Set(Object.keys(achievements.unlockedAchievements));
  const sortedAchievements = [...ACHIEVEMENTS].sort((a, b) => {
    const aUnlocked = unlockedIds.has(a.id);
    const bUnlocked = unlockedIds.has(b.id);
    if (aUnlocked && !bUnlocked) return -1;
    if (!aUnlocked && bUnlocked) return 1;
    return 0;
  });

  return (
    <div
      role="dialog"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 500,
          maxHeight: '80vh',
          background: '#0f0f0f',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 14,
          padding: 20,
          boxShadow: '0 0 40px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontWeight: 900, color: 'rgba(255,255,255,0.9)', fontSize: 18 }}>
            {t('achievements.title')} ({unlockedIds.size}/{ACHIEVEMENTS.length})
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
              fontSize: 20,
              padding: 4,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, paddingRight: 4 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {sortedAchievements.map((achievement) => {
              const isUnlocked = unlockedIds.has(achievement.id);
              const unlockedAt = isUnlocked ? achievements.unlockedAchievements[achievement.id] : null;

              return (
                <div
                  key={achievement.id}
                  style={{
                    background: isUnlocked 
                      ? 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)' 
                      : 'rgba(255,255,255,0.02)',
                    border: isUnlocked ? '1px solid rgba(255,215,0,0.3)' : '1px solid rgba(255,255,255,0.05)',
                    borderRadius: 12,
                    padding: 12,
                    opacity: isUnlocked ? 1 : 0.5,
                    filter: isUnlocked ? 'none' : 'grayscale(1)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ 
                      fontSize: 24, 
                      width: 40, 
                      height: 40, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      background: isUnlocked ? 'rgba(255,215,0,0.1)' : 'rgba(255,255,255,0.05)',
                      borderRadius: 8,
                    }}>
                      {achievement.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: isUnlocked ? '#FFD700' : 'rgba(255,255,255,0.7)', fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {t(achievement.name)}
                      </div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
                        {unlockedAt ? t('achievements.unlocked_at', { date: new Date(unlockedAt).toLocaleDateString() }) : t('achievements.unlocked_not')}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>
                    {t(achievement.description)}
                  </div>
                  {isUnlocked && (
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      right: 0,
                      padding: '2px 6px',
                      background: '#FFD700',
                      color: '#000',
                      fontSize: 9,
                      fontWeight: 900,
                      borderBottomLeftRadius: 8,
                    }}>
                      {t('achievements.at_at')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
