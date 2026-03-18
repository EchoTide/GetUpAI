import React, { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store/useAppStore';

export const ShareCard = forwardRef<HTMLDivElement>((props, ref) => {
  const { t, i18n } = useTranslation();
  const day = useAppStore(s => s.day);
  const achievements = useAppStore(s => s.achievements);
  const aiInsight = useAppStore(s => s.aiInsightLatest);
  
  const healthScore = Math.max(0, Math.min(100, Math.round(
    100 - (day.totalSitMs / 3600000 * 10) + ((day.totalStandMs + day.totalStandWorkMs) / 60000 * 0.5)
  )));

  const dateStr = new Date().toLocaleDateString(i18n.language === 'zh' ? 'zh-CN' : 'en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });

  return (
    <div ref={ref} style={{
      width: 400,
      minHeight: 600,
      height: 'auto',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      borderRadius: 20,
      padding: 30,
      color: '#fff',
      fontFamily: '"SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      boxSizing: 'border-box',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        top: -50,
        right: -50,
        width: 200,
        height: 200,
        background: 'radial-gradient(circle, rgba(64, 220, 255, 0.1) 0%, transparent 70%)',
        borderRadius: '50%',
      }} />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#40DCFF', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 24 }}>🚶</span>
          GetUpAI
        </div>
        <div style={{ opacity: 0.6, fontSize: 14 }}>{dateStr}</div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 30, zIndex: 1, padding: '20px 0' }}>
        
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1, textShadow: '0 0 20px rgba(92, 255, 184, 0.3)' }}>
            {healthScore}
          </div>
          <div style={{ fontSize: 16, opacity: 0.8, marginTop: 10, letterSpacing: 1 }}>{t('share.health_score')}</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <StatBox label={t('share.stat_stand_count')} value={day.standCount + day.standWorkCount} unit={t('share.unit_times')} />
          <StatBox label={t('share.stat_stand_duration')} value={Math.round((day.totalStandMs + day.totalStandWorkMs) / 60000)} unit={t('share.unit_min')} />
          <StatBox label={t('share.stat_sit_duration')} value={(day.totalSitMs / 3600000).toFixed(1)} unit={t('share.unit_hour')} />
          <StatBox label={t('share.stat_streak')} value={achievements.streakDays} unit={t('share.unit_day')} highlight />
        </div>
      </div>

      {aiInsight && (
        <div style={{ 
          background: 'rgba(255, 255, 255, 0.05)', 
          padding: 20, 
          borderRadius: 16, 
          fontSize: 14, 
          lineHeight: 1.6,
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          marginBottom: 20,
          zIndex: 1,
          wordBreak: 'break-word',
          whiteSpace: 'pre-wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, opacity: 0.8 }}>
            <span style={{ fontSize: 16 }}>🤖</span> {t('share.ai_insight')}
          </div>
          {aiInsight.text}
        </div>
      )}

      <div style={{ textAlign: 'center', opacity: 0.4, fontSize: 12, letterSpacing: 2, zIndex: 1 }}>
        {t('share.stay_active')}
      </div>
    </div>
  );
});

function StatBox({ label, value, unit, highlight }: { label: string, value: string | number, unit: string, highlight?: boolean }) {
  return (
    <div style={{ 
      background: highlight ? 'rgba(64, 220, 255, 0.1)' : 'rgba(255, 255, 255, 0.03)', 
      borderRadius: 16, 
      padding: 15,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      border: highlight ? '1px solid rgba(64, 220, 255, 0.3)' : '1px solid transparent'
    }}>
      <div style={{ fontSize: 24, fontWeight: 'bold', color: highlight ? '#40DCFF' : '#fff' }}>
        {value}<span style={{ fontSize: 12, opacity: 0.6, marginLeft: 4 }}>{unit}</span>
      </div>
      <div style={{ fontSize: 12, opacity: 0.5, marginTop: 4 }}>{label}</div>
    </div>
  );
}

ShareCard.displayName = 'ShareCard';
