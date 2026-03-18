import React from 'react';

export function StatTile(props: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: 'normal' | 'good' | 'warn' | 'danger';
  compact?: boolean;
}) {
  const { label, value, sub, tone = 'normal', compact = false } = props;
  const color =
    tone === 'good'
      ? '#00ff88'
      : tone === 'warn'
        ? '#ffcc00'
        : tone === 'danger'
          ? '#ff4444'
          : '#e6e6e6';

  return (
    <div
      style={{
        background:
          'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 14,
        padding: compact ? 10 : 12,
        minHeight: compact ? 58 : 64,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxShadow: '0 18px 45px rgba(0,0,0,0.35)',
      }}
    >
      <div style={{ fontSize: compact ? 10 : 11, letterSpacing: 0.4, color: 'rgba(255,255,255,0.55)' }}>
        {label}
      </div>
      <div style={{ fontSize: compact ? 17 : 19, fontWeight: 900, color, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
      {sub ? (
        <div style={{ fontSize: compact ? 10 : 11, color: 'rgba(255,255,255,0.42)', fontVariantNumeric: 'tabular-nums' }}>
          {sub}
        </div>
      ) : (
        <div />
      )}
    </div>
  );
}
