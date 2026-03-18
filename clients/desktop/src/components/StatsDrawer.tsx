import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface StatsDrawerProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
  label: string;
  testId?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function StatsDrawer({ children, defaultOpen = false, label, testId, open, onOpenChange }: StatsDrawerProps) {
  const { t } = useTranslation();
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const [isHovered, setIsHovered] = useState(false);
  const isControlled = typeof open === 'boolean';
  const isOpen = isControlled ? open : internalOpen;

  const handleToggle = () => {
    const nextOpen = !isOpen;
    if (!isControlled) {
      setInternalOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  };

  return (
    <div
      data-testid={testId}
      data-default-open={defaultOpen ? 'true' : 'false'}
      data-open={isOpen ? 'true' : 'false'}
      style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 14,
        boxShadow: '0 18px 45px rgba(0,0,0,0.35)',
        overflow: 'hidden',
        transition: 'all 0.3s ease-in-out',
      }}
    >
      <div
        onClick={handleToggle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          padding: 12,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          userSelect: 'none',
          color: isHovered ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.55)',
          transition: 'color 0.2s ease',
        }}
      >
        <div style={{ fontSize: 11, letterSpacing: 0.4, fontWeight: 500 }}>
          {label}
        </div>
          <div style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
            {isOpen ? (
              <>
                <span>{t('header.minimize')}</span>
                <span>▲</span>
              </>
            ) : (
              <span>▼</span>
            )}
          </div>
      </div>

      <div
        style={{
          maxHeight: isOpen ? '2000px' : '0px',
          opacity: isOpen ? 1 : 0,
          transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease-in-out',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '0 12px 12px 12px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
