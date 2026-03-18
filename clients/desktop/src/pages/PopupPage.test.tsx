import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createJSONStorage } from 'zustand/middleware';
import PopupPage from './PopupPage';
import { useAppStore } from '../store/useAppStore';

const aiChatMock = vi.fn();
const aiChatStreamMock = vi.fn();
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
      if (key === 'popup.exercises_completed') return `completed ${vars?.count ?? ''}`;
      if (key === 'popup.exercise_summary') return `共 ${vars?.count ?? ''} 个动作，约 ${vars?.minutes ?? ''} 分钟`;
      if (key === 'popup.next_exercise') return `下一个: ${vars?.name ?? ''}`;
      if (key === 'popup.ai_summary_title') return '近 7 天摘要（含今日）：';
      if (key === 'popup.ai_recent_excuses_title') return '最近借口：';
      if (key === 'popup.completed_title') return '站立完成';
      if (key === 'popup.completed_subtitle') return '干得漂亮，继续保持';
      if (key === 'popup.today_total_stands') return '今日累计站立';
      if (key === 'common.times') return `${vars?.count ?? ''} 次`;
      if (key === 'popup.completed_intervention_title') return 'GETUP.AI / 完成打卡';
      if (key === 'actions.continue') return '继续';
      return key;
    },
    i18n: { language: 'zh', changeLanguage: vi.fn() },
  }),
}));

vi.mock('../ai/aiService', () => ({
  aiChat: (...args: unknown[]) => aiChatMock(...args),
  aiChatStream: (...args: unknown[]) => aiChatStreamMock(...args),
}));

describe('PopupPage exercise guidance', () => {
  beforeEach(() => {
    vi.useRealTimers();
    aiChatMock.mockReset();
    aiChatStreamMock.mockReset();
    aiChatMock.mockResolvedValue(
      JSON.stringify([{ name: 'neck stretch', duration: 30, instruction: 'look left and right' }]),
    );
    aiChatStreamMock.mockResolvedValue('nudge');

    memoryStorage.clear();
    useAppStore.persist.setOptions({
      storage: createJSONStorage(() => memoryStorage),
    });
    useAppStore.setState(useAppStore.getInitialState(), true);
    useAppStore.setState((state) => ({
      ...state,
      mode: 'sitting',
      sitStartAt: Date.now() - 45 * 60 * 1000,
      standStartAt: null,
      settings: {
        ...state.settings,
        aiEnabled: true,
        exerciseGuidanceEnabled: true,
        language: 'zh',
        standSeconds: 120,
      },
    }));
  });

  it('requests AI exercise guidance only once for a standing session', async () => {
    render(
      <React.StrictMode>
        <PopupPage />
      </React.StrictMode>,
    );

    fireEvent.click(screen.getByTestId('btn-admit-mistake'));

    await waitFor(() => {
      expect(aiChatMock).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByText('actions.start_now'));

    await waitFor(() => {
      expect(useAppStore.getState().mode).toBe('standing');
    });

    expect(aiChatMock).toHaveBeenCalledTimes(1);
  });

  it('uses translated completion copy instead of raw i18n keys', async () => {
    await act(async () => {
      render(<PopupPage />);
    });

    expect(screen.queryByText('popup.great_job')).not.toBeInTheDocument();
    expect(screen.queryByText('actions.stand_done')).not.toBeInTheDocument();
    expect(screen.queryByText('popup.exercises_completed')).not.toBeInTheDocument();
    expect(screen.queryByText('popup.completed_intervention_title')).not.toBeInTheDocument();
    expect(screen.queryByText('popup.exercise_summary')).not.toBeInTheDocument();
    expect(screen.queryByText('popup.next_exercise')).not.toBeInTheDocument();
    expect(screen.queryByText('popup.ai_summary_title')).not.toBeInTheDocument();
    expect(screen.queryByText('popup.ai_recent_excuses_title')).not.toBeInTheDocument();
  });

  it('renders completion title with success styling tokens', async () => {
    vi.useFakeTimers();
    useAppStore.setState((state) => ({
      ...state,
      settings: {
        ...state.settings,
        aiEnabled: false,
        exerciseGuidanceEnabled: false,
        standSeconds: 1,
      },
    }));

    await act(async () => {
      render(<PopupPage />);
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-admit-mistake'));
    });

    expect(useAppStore.getState().mode).toBe('standing');

    await act(async () => {
      vi.advanceTimersByTime(2500);
      await Promise.resolve();
    });

    const title = screen.getByTestId('popup-title');
    expect(title).toHaveTextContent('站立完成');
    expect(title).toHaveStyle({ color: '#00ff88' });
  });

  it('uses a more focused prompt layout with compact copy and no completion summary card', async () => {
    aiChatStreamMock.mockResolvedValue('该起来活动一下，先站 2 分钟，肩膀放松。');

    await act(async () => {
      render(<PopupPage />);
    });

    expect(screen.getByTestId('popup-focus-shell')).toBeInTheDocument();
    expect(screen.getByTestId('popup-primary-message')).toBeInTheDocument();
    expect(screen.getByTestId('popup-title')).toHaveTextContent('popup.title');
    expect(screen.getByText('该起来活动一下，先站 2 分钟，肩膀放松。')).toBeInTheDocument();
    expect(screen.getByTestId('btn-admit-mistake')).toBeInTheDocument();
    expect(screen.queryByText('今日累计站立')).not.toBeInTheDocument();
  });

  it('shows the provider error reason when popup ai generation fails', async () => {
    aiChatStreamMock.mockRejectedValueOnce(new Error('Provider rate limit exceeded.'));

    await act(async () => {
      render(<PopupPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('AI generation failed: Provider rate limit exceeded.')).toBeInTheDocument();
    });
  });

  it('promotes the main prompt action and keeps secondary actions visually lighter', async () => {
    await act(async () => {
      render(<PopupPage />);
    });

    expect(screen.getByTestId('btn-admit-mistake')).toHaveStyle({ minWidth: '180px' });
    expect(screen.getByTestId('btn-give-reason')).toHaveStyle({ background: 'transparent' });
    expect(screen.getByTestId('btn-remind-later')).toHaveStyle({ background: 'transparent' });
  });

  it('shows a standing focus ring once the standing session starts', async () => {
    vi.useFakeTimers();
    useAppStore.setState((state) => ({
      ...state,
      settings: {
        ...state.settings,
        aiEnabled: false,
        exerciseGuidanceEnabled: false,
        standSeconds: 60,
      },
    }));

    await act(async () => {
      render(<PopupPage />);
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-admit-mistake'));
    });

    expect(screen.getByTestId('popup-stand-ring')).toBeInTheDocument();
  });
});
