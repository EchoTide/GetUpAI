import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DayHistoryItem, DayStats, ActivityLog } from '../store/useAppStore';
import { WeeklyChart } from './Charts/WeeklyChart';
import { MonthlyChart } from './Charts/MonthlyChart';
import { HeatmapChart } from './Charts/HeatmapChart';

interface Props {
  open: boolean;
  onClose: () => void;
  history: DayHistoryItem[];
  currentDay: DayStats;
  logs: ActivityLog[];
}

export function DataModal({ open, onClose, history, currentDay, logs }: Props) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'weekly' | 'monthly' | 'heatmap'>('weekly');

  if (!open) return null;

  return (
    <div
      role="dialog"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 800,
          maxWidth: '90vw',
          background: '#0f0f0f',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 14,
          padding: 20,
          boxShadow: '0 0 50px rgba(0,0,0,0.8)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'rgba(255,255,255,0.9)' }}>
            {t('header.stats')}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.6)',
              fontSize: 24,
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <Tab active={tab === 'weekly'} onClick={() => setTab('weekly')}>{t('stats.tab_weekly')}</Tab>
          <Tab active={tab === 'monthly'} onClick={() => setTab('monthly')}>{t('stats.tab_monthly')}</Tab>
          <Tab active={tab === 'heatmap'} onClick={() => setTab('heatmap')}>{t('stats.tab_heatmap')}</Tab>
        </div>

        <div style={{ flex: 1, minHeight: 400 }}>
          {tab === 'weekly' && <WeeklyChart history={history} currentDay={currentDay} />}
          {tab === 'monthly' && <MonthlyChart history={history} currentDay={currentDay} />}
          {tab === 'heatmap' && <HeatmapChart logs={logs} />}
        </div>
      </div>
    </div>
  );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 16px',
        background: active ? 'rgba(255,255,255,0.1)' : 'transparent',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 20,
        color: active ? '#fff' : 'rgba(255,255,255,0.6)',
        cursor: 'pointer',
        fontSize: 14,
        fontWeight: active ? 600 : 400,
        transition: 'all 0.2s',
      }}
    >
      {children}
    </button>
  );
}
