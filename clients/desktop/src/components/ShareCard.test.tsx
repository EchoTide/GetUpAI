import React from 'react';
import { render, screen } from '@testing-library/react';
import { ShareCard } from './ShareCard';
import { describe, it, expect, vi } from 'vitest';

vi.mock('../store/useAppStore', () => ({
  useAppStore: (selector: any) => selector({
    day: {
      totalSitMs: 3600000,
      totalStandMs: 60000,
      totalStandWorkMs: 0,
      standCount: 1,
      standWorkCount: 0,
    },
    achievements: {
      streakDays: 5,
    },
    aiInsightLatest: {
      text: "This is a very long AI insight text to test dynamic height. ".repeat(20),
    },
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

describe('ShareCard', () => {
  it('renders with correct data and styles', () => {
    const { container } = render(<ShareCard />);
    
    expect(screen.getByText('91')).toBeInTheDocument();
    
    expect(screen.getByText('share.health_score')).toBeInTheDocument();
    expect(screen.getByText('share.stat_stand_count')).toBeInTheDocument();
    expect(screen.getByText('share.ai_insight')).toBeInTheDocument();
    
    expect(screen.getByText(/This is a very long AI insight/)).toBeInTheDocument();

    const card = container.firstChild as HTMLElement;
    expect(card.style.minHeight).toBe('600px');
    expect(card.style.height).toBe('auto');
  });
});
