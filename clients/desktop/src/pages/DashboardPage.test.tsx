import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createJSONStorage } from 'zustand/middleware';
import DashboardPage from './DashboardPage';
import { useAppStore } from '../store/useAppStore';

const memoryStorage = (() => {
  const map = new Map<string, string>();
  return {
    getItem: (name: string) => map.get(name) ?? null,
    setItem: (name: string, value: string) => {
      map.set(name, value);
    },
    removeItem: (name: string) => {
      map.delete(name);
    },
    clear: () => {
      map.clear();
    },
  };
})();

vi.mock('react-i18next', () => ({
  initReactI18next: { type: '3rdParty', init: vi.fn() },
  useTranslation: () => ({
    t: (key: string, vars?: Record<string, unknown>) => {
      if (key === 'stats.today_stand_count') return '今日起立次数';
      if (key === 'stats.spine_health') return '脊椎健康度';
      if (key === 'stats.more_data') return '更多数据';
      if (key === 'stats.last_stand') return '距上次起立';
      if (key === 'stats.today_sit') return '今日累计久坐';
      if (key === 'stats.longest_sit') return '最长连续久坐';
      if (key === 'stats.excuse_count') return '借口次数';
      if (key === 'stats.stand_work_count') return '站立办公次数';
      if (key === 'stats.safe') return '安全';
      if (key === 'stats.warning') return '警惕';
      if (key === 'stats.danger') return '危险';
      if (key === 'stats.no_record') return '暂无记录';
      if (key === 'actions.stand_active') return '主动站立';
      if (key === 'actions.pause') return '暂停';
      if (key === 'status.standing_work') return '站立办公';
      if (key === 'countdown.next_punishment_short') return '下次处罚';
      if (key === 'common.times') return `${vars?.count ?? ''} 次`;
      return key;
    },
    i18n: { language: 'zh', changeLanguage: vi.fn() },
  }),
}));

const aiChatStreamMock = vi.fn().mockResolvedValue('nudge');

vi.mock('../ai/aiService', () => ({
  aiChatStream: (...args: unknown[]) => aiChatStreamMock(...args),
}));

vi.mock('../components/SyncStatusIndicator', () => ({
  default: () => <div data-testid="sync-indicator" />,
}));

vi.mock('../components/OfflineBanner', () => ({
  default: () => null,
}));

describe('DashboardPage focused layout', () => {
  beforeEach(() => {
    aiChatStreamMock.mockReset();
    aiChatStreamMock.mockResolvedValue('nudge');
    memoryStorage.clear();
    (window as any).electronAPI = {
      getPersistedStateSync: vi.fn().mockImplementation((name: string) => {
        if (name !== 'ai-config') return null;
        return JSON.stringify({
          baseUrl: 'https://api.example.com/v1/chat/completions',
          model: 'gpt-4o-mini',
          timeoutMs: 15000,
        });
      }),
      aiGetApiKey: vi.fn().mockResolvedValue('sk-test'),
      aiSetApiKey: vi.fn().mockResolvedValue(true),
      aiClearApiKey: vi.fn().mockResolvedValue(true),
    };
    useAppStore.persist.setOptions({
      storage: createJSONStorage(() => memoryStorage),
    });
    useAppStore.setState(useAppStore.getInitialState(), true);

    useAppStore.setState((state) => ({
      ...state,
      mode: 'sitting',
      sitStartAt: Date.now() - 30 * 60 * 1000,
      day: {
        ...state.day,
        standCount: 7,
        standWorkCount: 3,
        totalSitMs: 90 * 60 * 1000,
        longestSitMs: 62 * 60 * 1000,
      },
      settings: {
        ...state.settings,
        standSeconds: 600,
      },
    }));
  });

  it('renders a focused desktop hero with open data section and clear spacing under the primary action', () => {
    render(<DashboardPage />);

    expect(screen.getByTestId('dashboard-root').getAttribute('style') ?? '').not.toContain('border-top');
    expect(screen.getByTestId('dashboard-status-badge')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-status-badge')).toHaveStyle({ borderRadius: '999px' });
    expect(screen.getByTestId('dashboard-topbar-row')).toHaveStyle({ marginBottom: '10px' });
    expect(screen.getByTestId('dashboard-topbar-core')).toHaveStyle({ padding: '3px' });
    expect(screen.getByTestId('dashboard-topbar-core')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-topbar-more')).toBeInTheDocument();
    expect(screen.getAllByTestId('sync-indicator')).toHaveLength(1);
    expect(screen.getByTestId('dashboard-window-controls').getAttribute('style') ?? '').not.toContain('border-left');
    expect(screen.queryByTitle('header.daily_insight')).not.toBeInTheDocument();
    expect(screen.queryByTitle('header.stats')).not.toBeInTheDocument();
    expect(screen.queryByTitle('header.share')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('dashboard-topbar-more'));
    expect(screen.getByTestId('dashboard-topbar-menu')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-topbar-menu')).toHaveStyle({ minWidth: '210px' });
    expect(screen.getByTestId('dashboard-focus-hero')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-focus-hero')).toHaveStyle({ flex: 'none' });
    expect(screen.getByTestId('dashboard-desktop-layout')).toHaveStyle({ justifyContent: 'space-between' });
    expect(screen.getByTestId('dashboard-main-content')).toHaveStyle({ overflowY: 'hidden' });
    expect(screen.getByTestId('dashboard-focus-ring')).toHaveStyle({ width: '220px' });
    expect(screen.getByTestId('dashboard-primary-action')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-side-stats')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-primary-action-wrap')).toHaveStyle({ marginBottom: '8px' });
    expect(screen.getByTestId('dashboard-more-data')).toHaveAttribute('data-default-open', 'true');
    expect(screen.getByTestId('dashboard-more-data-actions')).toBeInTheDocument();

    fireEvent.click(screen.getByText('更多数据'));
    expect(screen.getByTestId('dashboard-focus-hero')).toHaveStyle({ flex: '1 1 0%' });
  });

  it('restores direct-provider AI configuration controls in the AI settings tab', async () => {
    render(<DashboardPage />);

    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-settings'));
    });

    await waitFor(() => {
      expect(screen.getByText('settings.tab_ai')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('settings.tab_ai'));
      await Promise.resolve();
    });

    expect(screen.getByText('settings.base_url')).toBeInTheDocument();
    expect(screen.getByText('settings.model')).toBeInTheDocument();
    expect(screen.getByText('settings.timeout')).toBeInTheDocument();
    expect(screen.getByText('settings.api_key')).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://api.example.com/v1/chat/completions')).toBeInTheDocument();
    expect(screen.getByDisplayValue('gpt-4o-mini')).toBeInTheDocument();
  });

  it('shows the provider error reason when daily insight generation fails', async () => {
    aiChatStreamMock.mockRejectedValueOnce(new Error('Invalid API key provided.'));

    render(<DashboardPage />);

    fireEvent.click(screen.getByTestId('dashboard-topbar-more'));
    fireEvent.click(screen.getByText('header.daily_insight'));

    await waitFor(() => {
      expect(screen.getByText('AI generation failed: Invalid API key provided.')).toBeInTheDocument();
    });
  });

  it('closes the topbar menu when opening settings', async () => {
    render(<DashboardPage />);

    fireEvent.click(screen.getByTestId('dashboard-topbar-more'));
    expect(screen.getByTestId('dashboard-topbar-menu')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-settings'));
      await Promise.resolve();
    });

    expect(screen.queryByTestId('dashboard-topbar-menu')).not.toBeInTheDocument();
  });

  it('closes the topbar menu when clicking outside of it', () => {
    render(<DashboardPage />);

    fireEvent.click(screen.getByTestId('dashboard-topbar-more'));
    expect(screen.getByTestId('dashboard-topbar-menu')).toBeInTheDocument();

    expect(screen.getByTestId('dashboard-topbar-overlay')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId('dashboard-topbar-overlay'));

    expect(screen.queryByTestId('dashboard-topbar-menu')).not.toBeInTheDocument();
  });
});
