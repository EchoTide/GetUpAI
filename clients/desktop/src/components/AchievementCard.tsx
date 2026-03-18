import React from 'react';
import { useTranslation } from 'react-i18next';
import { AchievementDef } from '../utils/achievements';

export function AchievementCard(props: {
  streakDays: number;
  unlockedCount: number;
  totalCount: number;
  latestAchievement?: AchievementDef;
  onClick: () => void;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const { streakDays, unlockedCount, totalCount, latestAchievement, onClick, compact = false } = props;

  return (
    <div
      onClick={onClick}
      style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 14,
        padding: compact ? 10 : 12,
        minHeight: compact ? 58 : 64,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxShadow: '0 18px 45px rgba(0,0,0,0.35)',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'linear-gradient(180deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.05) 100%)';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 100%)';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontSize: compact ? 10 : 11, letterSpacing: 0.4, color: 'rgba(255,255,255,0.55)' }}>
          {t('achievements.title')}
        </div>
        {latestAchievement && (
          <div
            style={{
              fontSize: 10,
              padding: '2px 6px',
              borderRadius: 4,
              background: 'rgba(0,255,136,0.1)',
              color: '#00ff88',
              border: '1px solid rgba(0,255,136,0.2)',
            }}
          >
            {t('achievements.new_unlocked')}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <div style={{ fontSize: compact ? 17 : 19, fontWeight: 900, color: '#FFD700', fontVariantNumeric: 'tabular-nums' }}>
          {streakDays}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)' }}>{t('achievements.streak_suffix')}</div>
      </div>

      <div style={{ fontSize: compact ? 10 : 11, color: 'rgba(255,255,255,0.42)', fontVariantNumeric: 'tabular-nums', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{t('achievements.unlocked_count', { unlocked: unlockedCount, total: totalCount })}</span>
        {latestAchievement && (
           <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'rgba(255,255,255,0.7)' }}>
             <span>{latestAchievement.icon}</span>
             <span style={{ maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t(latestAchievement.name)}</span>
           </span>
        )}
      </div>
    </div>
  );
}
