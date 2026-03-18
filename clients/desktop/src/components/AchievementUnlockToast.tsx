import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AchievementDef } from '../utils/achievements';

export interface ToastData extends AchievementDef {
  type?: 'achievement' | 'reminder';
  customTitle?: string;
}

interface AchievementUnlockToastProps {
  achievement: ToastData;
  onClose: () => void;
}

export function AchievementUnlockToast({ achievement, onClose }: AchievementUnlockToastProps) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const isReminder = achievement.type === 'reminder';
  const title = achievement.customTitle ?? (isReminder ? t('notification.toast_title') : t('achievements.new_unlocked'));
  const borderColor = isReminder ? 'rgba(255, 68, 68, 0.4)' : 'rgba(255, 215, 0, 0.3)';
  const iconBg = isReminder ? 'rgba(255, 68, 68, 0.15)' : 'rgba(255, 215, 0, 0.1)';
  const titleColor = isReminder ? '#ff6666' : '#FFD700';

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 10);
    const t2 = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, 3000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [achievement, onClose]);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        width: 320,
        background: 'rgba(15, 15, 15, 0.95)',
        border: `1px solid ${borderColor}`,
        borderRadius: 12,
        padding: 16,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div
        style={{
          fontSize: 32,
          background: iconBg,
          width: 56,
          height: 56,
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {achievement.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ 
          color: titleColor, 
          fontSize: 12, 
          fontWeight: 800, 
          letterSpacing: 0.5,
          marginBottom: 4,
          textTransform: 'uppercase'
        }}>
          {title}
        </div>
        <div style={{ 
          color: 'rgba(255, 255, 255, 0.95)',  
          fontSize: 15, 
          fontWeight: 700,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {isReminder ? achievement.name : t(achievement.name)}
        </div>
        <div style={{ 
          color: 'rgba(255, 255, 255, 0.6)', 
          fontSize: 12,
          marginTop: 2,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {isReminder ? achievement.description : t(achievement.description)}
        </div>
      </div>
      <button
        onClick={() => {
          setVisible(false);
          setTimeout(onClose, 300);
        }}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'rgba(255, 255, 255, 0.4)',
          cursor: 'pointer',
          padding: 4,
          fontSize: 18,
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  );
}
