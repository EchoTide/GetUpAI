import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { aiChat, aiChatStream } from '../ai/aiService';
import { clearAiApiKey, loadAiApiKey, loadAiProviderConfigSync, saveAiApiKey, saveAiProviderConfigSync } from '../ai/aiConfig';
import { personalityFromStrictness } from '../ai/aiContext';
import { buildMomentC } from '../ai/prompts';
import { StatTile } from '../components/StatTile';
import { AchievementCard } from '../components/AchievementCard';
import { AchievementModal } from '../components/AchievementModal';
import { AchievementUnlockToast, ToastData } from '../components/AchievementUnlockToast';
import { DataModal } from '../components/DataModal';
import { ShareModal } from '../components/ShareModal';
import { StatsDrawer } from '../components/StatsDrawer';
import { useAppStore } from '../store/useAppStore';
import { formatDurationShort, formatHMS, formatRelativeTime } from '../utils/format';
import { ACHIEVEMENTS, AchievementDef } from '../utils/achievements';
import SyncStatusIndicator from '../components/SyncStatusIndicator';
import OfflineBanner from '../components/OfflineBanner';

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function formatPercent(n: number) {
  return `${Math.round(clamp(n, 0, 100))}%`;
}

function minuteToTime(minute: number) {
  const m = ((minute % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
}

function timeToMinute(value: string) {
  const m = /^(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(mm) || h < 0 || h > 23 || mm < 0 || mm > 59) return null;
  return h * 60 + mm;
}

function localMinuteOfDay(ts: number) {
  const d = new Date(ts);
  return d.getHours() * 60 + d.getMinutes();
}

function isInRest(
  now: number,
  restEnabled: boolean,
  restWindows?: { enabled: boolean; startMinute: number; endMinute: number }[],
) {
  if (!restEnabled) return false;
  const m = localMinuteOfDay(now);
  return (restWindows ?? []).some((w) => {
    if (!w.enabled) return false;
    const start = w.startMinute;
    const end = w.endMinute;
    return start < end ? m >= start && m < end : m >= start || m < end;
  });
}

function HeaderButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { style, ...rest } = props;
  return (
    <button
      {...rest}
      style={{
        height: 30,
        padding: '0 10px',
        fontSize: 12,
        fontWeight: 800,
        borderRadius: 999,
        border: '1px solid rgba(255,255,255,0.12)',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))',
        color: 'rgba(255,255,255,0.85)',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        ...({ WebkitAppRegion: 'no-drag' } as any),
        ...style,
      }}
    />
  );
}

function HeaderIconButton(props: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'neutral' | 'danger' }) {
  const { tone = 'neutral', style, ...rest } = props;
  const danger = tone === 'danger';
  return (
    <button
      {...rest}
      style={{
        width: 30,
        height: 30,
        padding: 0,
        borderRadius: 999,
        border: danger ? '1px solid rgba(255,68,68,0.35)' : '1px solid rgba(255,255,255,0.12)',
        background: danger
          ? 'linear-gradient(180deg, rgba(255,68,68,0.16), rgba(255,255,255,0.03))'
          : 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))',
        color: danger ? '#ff4444' : 'rgba(255,255,255,0.85)',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...({ WebkitAppRegion: 'no-drag' } as any),
        ...style,
      }}
    />
  );
}

function Icon(props: { name: 'gear' | 'spark' | 'stand' | 'beaker' | 'moon' | 'min' | 'close' | 'chart' | 'share'; color?: string; size?: number }) {
  const { name, color = 'currentColor', size = 14 } = props;
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    style: { display: 'block', flex: `0 0 ${size}px` },
    vectorEffect: 'non-scaling-stroke' as any,
  };
  if (name === 'min') {
    return (
      <svg {...common}>
        <path d="M6 12h12" />
      </svg>
    );
  }
  if (name === 'chart') {
    return (
      <svg {...common}>
        <path d="M18 20V10" />
        <path d="M12 20V4" />
        <path d="M6 20v-6" />
      </svg>
    );
  }
  if (name === 'close') {
    return (
      <svg {...common}>
        <path d="M7 7l10 10" />
        <path d="M17 7L7 17" />
      </svg>
    );
  }
  if (name === 'spark') {
    return (
      <svg {...common}>
        <path d="M12 2l1.2 4.2L17 7.4l-3.8 1.2L12 13l-1.2-4.4L7 7.4l3.8-1.2L12 2z" />
        <path d="M5 12l.7 2.4L8 15l-2.3.7L5 18l-.7-2.3L2 15l2.3-.6L5 12z" />
      </svg>
    );
  }
  if (name === 'moon') {
    return (
      <svg {...common}>
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    );
  }
  if (name === 'gear') {
    return (
      <svg {...common}>
        <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" />
        <path d="M19.4 15a7.8 7.8 0 0 0 .1-1l2-1.2-2-3.4-2.3.5a7.6 7.6 0 0 0-1.7-1L15 6.6 11 4.4 9.8 6.4a7.8 7.8 0 0 0-1.9.4L5.9 6 3.9 9.4l1.9 1.1a7.8 7.8 0 0 0 0 2.1l-1.9 1.1L5.9 17l2.1-.8a7.8 7.8 0 0 0 1.8.9L11 19.6l4-.2 1-2.2a7.8 7.8 0 0 0 1.6-1l2.4.6 2-3.4-2-1.2z" />
      </svg>
    );
  }
  if (name === 'stand') {
    return (
      <svg {...common}>
        <path d="M8 21h8" />
        <path d="M12 17v4" />
        <path d="M7 7a5 5 0 0 1 10 0v4a5 5 0 0 1-10 0V7z" />
      </svg>
    );
  }
  if (name === 'share') {
    return (
      <svg {...common}>
        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
        <polyline points="16 6 12 2 8 6" />
        <line x1="12" y1="2" x2="12" y2="15" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M9 3h6l1 3h3l-2 4 2 4h-3l-1 3H9l-1-3H5l2-4-2-4h3l1-3z" />
      <path d="M9 9h6" />
      <path d="M10 13h4" />
    </svg>
  );
}

function MoreIcon(props: { color?: string; size?: number }) {
  const { color = 'currentColor', size = 14 } = props;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display: 'block', flex: `0 0 ${size}px` }}>
      <circle cx="5" cy="12" r="1.8" fill={color} />
      <circle cx="12" cy="12" r="1.8" fill={color} />
      <circle cx="19" cy="12" r="1.8" fill={color} />
    </svg>
  );
}

function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { style, ...rest } = props;
  return (
    <button
      {...rest}
      style={{
        ...({ WebkitAppRegion: 'no-drag' } as any),
        padding: '12px 14px',
        fontSize: 13,
        fontWeight: 900,
        borderRadius: 14,
        border: '1px solid rgba(255,68,68,0.38)',
        background: 'linear-gradient(180deg, rgba(255,84,84,1) 0%, rgba(255,68,68,1) 100%)',
        color: '#160607',
        cursor: 'pointer',
        boxShadow: '0 18px 48px rgba(255,68,68,0.18)',
        ...style,
      }}
    />
  );
}

function GhostButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { style, ...rest } = props;
  return (
    <button
      {...rest}
      style={{
        ...({ WebkitAppRegion: 'no-drag' } as any),
        padding: '12px 14px',
        fontSize: 13,
        fontWeight: 800,
        borderRadius: 14,
        border: '1px solid rgba(255,255,255,0.12)',
        background: 'rgba(255,255,255,0.04)',
        color: 'rgba(255,255,255,0.9)',
        cursor: 'pointer',
        boxShadow: '0 18px 45px rgba(0,0,0,0.35)',
        ...style,
      }}
    />
  );
}

function Modal(props: { open: boolean; title: string; width?: number; children: React.ReactNode; onClose: () => void }) {
  if (!props.open) return null;
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
        zIndex: 3000,
      }}
      onClick={props.onClose}
    >
      <div
        style={{
          width: props.width ?? 340,
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          ...({ WebkitAppRegion: 'no-drag' } as any),
          background: '#0f0f0f',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 14,
          padding: 16,
          boxShadow: '0 0 40px rgba(0,0,0,0.6)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ fontWeight: 900, color: 'rgba(255,255,255,0.9)' }}>{props.title}</div>
          <button
            onClick={props.onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
              fontSize: 16,
            }}
          >
            ×
          </button>
        </div>
        <div style={{ marginTop: 12, overflowY: 'auto', minHeight: 0, flex: 1 }}>{props.children}</div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { t, i18n } = useTranslation();
  const now = useNow(1000);

  const mode = useAppStore((s) => s.mode);
  const sitStartAt = useAppStore((s) => s.sitStartAt);
  const standStartAt = useAppStore((s) => s.standStartAt);
  const standWorkStartAt = useAppStore((s) => s.standWorkStartAt);
  const pauseUntil = useAppStore((s) => s.pauseUntil);
  const pauseReason = useAppStore((s) => s.pauseReason);
  const nextReminderAt = useAppStore((s) => s.nextReminderAt);
  const lastAdaptiveIntervalChange = useAppStore((s) => s.lastAdaptiveIntervalChange);
  const settings = useAppStore((s) => s.settings);
  const day = useAppStore((s) => s.day);
  const dayHistory = useAppStore((s) => s.dayHistory);
  const logs = useAppStore((s) => s.logs);
  const aiInsightLatest = useAppStore((s) => s.aiInsightLatest);
  const aiInsightHistory = useAppStore((s) => s.aiInsightHistory);

  const ensureToday = useAppStore((s) => s.ensureToday);
  const repairInvalidState = useAppStore((s) => s.repairInvalidState);
  const sanitizeBootBoundary = useAppStore((s) => s.sanitizeBootBoundary);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const upsertDailyInsight = useAppStore((s) => s.upsertDailyInsight);
  const enableDnd = useAppStore((s) => s.enableDnd);
  const disableDnd = useAppStore((s) => s.disableDnd);
  const checkpointToday = useAppStore((s) => s.checkpointToday);
  const applySchedule = useAppStore((s) => s.applySchedule);
  const endRestEarly = useAppStore((s) => s.endRestEarly);
  const triggerReminder = useAppStore((s) => s.triggerReminder);
  const startStanding = useAppStore((s) => s.startStanding);
  const finishStanding = useAppStore((s) => s.finishStanding);
  const recordStand = useAppStore((s) => s.recordStand);
  const startStandingWork = useAppStore((s) => s.startStandingWork);
  const stopStandingWork = useAppStore((s) => s.stopStandingWork);
  const submitExcuse = useAppStore((s) => s.submitExcuse);
  const pauseForMinutes = useAppStore((s) => s.pauseForMinutes);
  const ignoreReminder = useAppStore((s) => s.ignoreReminder);
  const resume = useAppStore((s) => s.resume);
  const cancelStanding = useAppStore((s) => s.cancelStanding);
  const enterIdle = useAppStore((s) => s.enterIdle);
  const exitIdle = useAppStore((s) => s.exitIdle);

  const [bootAt, setBootAt] = useState<number | null>(null);

  useEffect(() => {
    if (!window.electronAPI?.on) return;

    const offStood = window.electronAPI.on('checkin:stood', (payload) => {
      try {
        const p = payload as { at?: unknown; standDurationMs?: unknown };
        const at = typeof p?.at === 'number' ? p.at : Date.now();
        const standDurationMs =
          typeof p?.standDurationMs === 'number'
            ? p.standDurationMs
            : typeof p?.standDurationMs === 'string'
              ? Number(p.standDurationMs)
              : undefined;
        recordStand(at, Number.isFinite(standDurationMs as number) ? (standDurationMs as number) : undefined);
      } catch {}
    });

    const offExcuse = window.electronAPI.on('checkin:excuse', (payload) => {
      try {
        const p = payload as { at?: unknown; excuse?: unknown; reply?: unknown };
        const at = typeof p?.at === 'number' ? p.at : Date.now();
        if (typeof p?.excuse === 'string' && typeof p?.reply === 'string') {
          submitExcuse(at, p.excuse, p.reply);
        }
      } catch {}
    });

    const offPause = window.electronAPI.on('checkin:pause', (payload) => {
      try {
        const p = payload as { at?: unknown; minutes?: unknown };
        const at = typeof p?.at === 'number' ? p.at : Date.now();
        const minutesRaw = typeof p?.minutes === 'number' ? p.minutes : typeof p?.minutes === 'string' ? Number(p.minutes) : NaN;
        if (Number.isFinite(minutesRaw) && minutesRaw > 0) {
          pauseForMinutes(at, minutesRaw);
        }
      } catch {}
    });

    const offIgnore = window.electronAPI.on('checkin:ignore', (payload) => {
      try {
        const p = payload as { at?: unknown };
        const at = typeof p?.at === 'number' ? p.at : Date.now();
        ignoreReminder(at);
      } catch {}
    });

    const offStandWork = window.electronAPI.on('checkin:stand_work_start', (payload) => {
      try {
        const p = payload as { at?: unknown };
        const at = typeof p?.at === 'number' ? p.at : Date.now();
        startStandingWork(at);
      } catch {}
    });

    const offLock = (window.electronAPI as any)?.onSystemLock?.(() => {
      if (settings.lockScreenPauseEnabled) {
        enterIdle(Date.now(), 'lock');
      }
    });

    const offUnlock = (window.electronAPI as any)?.onSystemUnlock?.(() => {
      exitIdle(Date.now());
    });

    return () => {
      if (typeof offStood === 'function') offStood();
      if (typeof offExcuse === 'function') offExcuse();
      if (typeof offPause === 'function') offPause();
      if (typeof offIgnore === 'function') offIgnore();
      if (typeof offStandWork === 'function') offStandWork();
      if (typeof offLock === 'function') offLock();
      if (typeof offUnlock === 'function') offUnlock();
    };
  }, [ignoreReminder, pauseForMinutes, recordStand, startStandingWork, submitExcuse, enterIdle, exitIdle, settings.lockScreenPauseEnabled]);

  useEffect(() => {
    const lang = settings.language;
    if (i18n && typeof i18n.changeLanguage === 'function') {
      i18n.changeLanguage(lang);
    }
  }, [settings.language, i18n]);

  useEffect(() => {
    let canceled = false;
    (async () => {
      const getSystemBootTime = window.electronAPI?.getSystemBootTime;
      if (!getSystemBootTime) return;
      try {
        const bootAt = await getSystemBootTime();
        if (!canceled && typeof bootAt === 'number' && Number.isFinite(bootAt)) {
          setBootAt(bootAt);
        }
      } catch {}
    })();
    return () => {
      canceled = true;
    };
  }, []);

  useEffect(() => {
    ensureToday(now);
    sanitizeBootBoundary(now, bootAt);
    repairInvalidState(now);
    applySchedule(now);
    if (mode === 'paused' && pauseUntil && now >= pauseUntil) {
      resume(now);
    }
  }, [applySchedule, bootAt, ensureToday, mode, now, pauseUntil, repairInvalidState, resume, sanitizeBootBoundary]);

  useEffect(() => {
    if (!settings.idleDetectionEnabled || !(window.electronAPI as any)?.getIdleTime) return;
    const t = setInterval(async () => {
      try {
        const idleSec = await (window.electronAPI as any)!.getIdleTime!();
        if (idleSec >= settings.idleThresholdMinutes * 60) {
          enterIdle(Date.now(), 'idle');
        } else if (mode === 'paused' && pauseReason === 'idle') {
           exitIdle(Date.now());
        }
      } catch {}
    }, 10000);
    return () => clearInterval(t);
  }, [settings.idleDetectionEnabled, settings.idleThresholdMinutes, enterIdle, exitIdle, mode, pauseReason]);

  const [showAdaptiveNotification, setShowAdaptiveNotification] = useState(false);
  const adaptiveNotificationTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (lastAdaptiveIntervalChange && lastAdaptiveIntervalChange.newInterval < lastAdaptiveIntervalChange.oldInterval) {
      setShowAdaptiveNotification(true);
      if (adaptiveNotificationTimerRef.current) {
        clearTimeout(adaptiveNotificationTimerRef.current);
      }
      adaptiveNotificationTimerRef.current = setTimeout(() => {
        setShowAdaptiveNotification(false);
        useAppStore.setState({ lastAdaptiveIntervalChange: null });
      }, 7000); // Show for 7 seconds
    }
    return () => {
      if (adaptiveNotificationTimerRef.current) {
        clearTimeout(adaptiveNotificationTimerRef.current);
      }
    };
  }, [lastAdaptiveIntervalChange]);

  useEffect(() => {
    if (window.electronAPI?.resizeMain && window.innerWidth < 600) {
      window.electronAPI.resizeMain(980, 700);
    }
  }, []);

  useEffect(() => {
    const t = window.setInterval(() => {
      checkpointToday(Date.now());
    }, 60000);
    const onBeforeUnload = () => checkpointToday(Date.now());
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.clearInterval(t);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [checkpointToday]);

  const [standModalOpen, setStandModalOpen] = useState(false);
  const [pauseModalOpen, setPauseModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'general' | 'ai'>('general');
  const [aiConfig, setAiConfig] = useState(() => loadAiProviderConfigSync());
  const [aiApiKeyInput, setAiApiKeyInput] = useState('');
  const [aiHasSavedKey, setAiHasSavedKey] = useState(false);
  const [aiConfigNotice, setAiConfigNotice] = useState<string | null>(null);
  const [aiConfigNoticeTone, setAiConfigNoticeTone] = useState<'ok' | 'error'>('ok');
  const [aiTesting, setAiTesting] = useState(false);
  const [insightModalOpen, setInsightModalOpen] = useState(false);
  const [dataModalOpen, setDataModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightDraft, setInsightDraft] = useState<string>('');
  const insightAbortRef = useRef<AbortController | null>(null);

  const [achievementModalOpen, setAchievementModalOpen] = useState(false);
  const [topbarMoreOpen, setTopbarMoreOpen] = useState(false);
  const topbarMoreRef = useRef<HTMLDivElement | null>(null);
  const [desktopStatsOpen, setDesktopStatsOpen] = useState(true);
  const [toastQueue, setToastQueue] = useState<ToastData[]>([]);
  const prevUnlockedRef = useRef<Set<string> | null>(null);
  const achievements = useAppStore((s) => s.achievements);

  useEffect(() => {
    const unlocked = achievements.unlockedAchievements;
    const currentKeys = Object.keys(unlocked);

    if (prevUnlockedRef.current === null) {
      prevUnlockedRef.current = new Set(currentKeys);
      return;
    }

    const newUnlocks: AchievementDef[] = [];
    currentKeys.forEach((key) => {
      if (!prevUnlockedRef.current!.has(key)) {
        const def = ACHIEVEMENTS.find((a) => a.id === key);
        if (def) newUnlocks.push(def);
      }
    });

    if (newUnlocks.length > 0) {
      setToastQueue((prev) => [...prev, ...newUnlocks]);
    }

    prevUnlockedRef.current = new Set(currentKeys);
  }, [achievements.unlockedAchievements]);

  const unlockedCount = Object.keys(achievements.unlockedAchievements).length;
  const latestUnlockedId = Object.entries(achievements.unlockedAchievements).sort(([, a], [, b]) => b - a)[0]?.[0];
  const latestAchievement = latestUnlockedId ? ACHIEVEMENTS.find((a) => a.id === latestUnlockedId) : undefined;


  const todayKey = useMemo(() => {
    const d = new Date(now);
    const pad2 = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }, [now]);

  const standEndsAt = mode === 'standing' && standStartAt ? standStartAt + settings.standSeconds * 1000 : null;
  const standLeftSec = standEndsAt ? Math.max(0, Math.ceil((standEndsAt - now) / 1000)) : 0;

  const currentSitMs = mode === 'sitting' && sitStartAt ? now - sitStartAt : 0;
  const todaySitMs = day.totalSitMs + Math.max(0, currentSitMs);
  const currentStandPenaltyMs = mode === 'standing' && standStartAt ? Math.max(0, now - standStartAt) : 0;
  const currentStandWorkMs = mode === 'standing_work' && standWorkStartAt ? Math.max(0, now - standWorkStartAt) : 0;
  const todayStandMs = day.totalStandMs + currentStandPenaltyMs + currentStandWorkMs;
  const todayStandWorkMs = day.totalStandWorkMs + currentStandWorkMs;
  const todayStandCount = day.standCount + day.standWorkCount;

  const reminderLeftSec = Math.max(0, Math.ceil((nextReminderAt - now) / 1000));
  const intervalSec = settings.intervalMinutes * 60;
  const sittingProgress = intervalSec > 0 ? clamp(1 - reminderLeftSec / intervalSec, 0, 1) : 0;
  const standingPenaltyProgress =
    settings.standSeconds > 0 ? clamp(1 - Math.max(0, standLeftSec) / settings.standSeconds, 0, 1) : 0;

    const centerValue = useMemo(() => {
    if (mode === 'standing') return formatHMS(Math.max(0, standLeftSec));
    if (mode === 'paused' && pauseReason === 'dnd') return '∞';
    if (mode === 'paused' && pauseUntil) return formatHMS(Math.ceil(Math.max(0, pauseUntil - now) / 1000));
    if (mode === 'standing_work') return formatHMS(Math.floor(Math.max(0, currentStandWorkMs) / 1000));
    if (mode === 'sitting') {
      const lastLog = logs[0];
      if (lastLog && lastLog.type === 'trigger' && (now - lastLog.at) < 5 * 60 * 1000) {
        return '00:00';
      }
    }
    return formatHMS(reminderLeftSec);
  }, [mode, now, pauseReason, pauseUntil, reminderLeftSec, standLeftSec, logs]);

  const healthScore = useMemo(() => {
    const sitHours = todaySitMs / 3600000;
    const standMinutes = todayStandMs / 60000;
    const value = 100 - sitHours * 10 + standMinutes * 0.5;
    return clamp(value, 0, 100);
  }, [todaySitMs, todayStandMs]);

  const healthPct = useMemo(() => Math.round(healthScore), [healthScore]);
  const healthPctText = useMemo(() => {
    const n = Math.round(healthScore * 10) / 10;
    return Number.isInteger(n) ? n.toFixed(0) : n.toFixed(1);
  }, [healthScore]);

  const healthTone = healthPct >= 80 ? 'good' : healthPct >= 50 ? 'warn' : 'danger';

  const lastStandRelative = formatRelativeTime(now, day.lastStandAt);
  const lastStandDanger = day.lastStandAt ? now - day.lastStandAt > 2 * 60 * 60 * 1000 : true;

  const restWindows = settings.restWindows ?? [];
  const restNow = isInRest(now, settings.restEnabled, restWindows);
  const standMinutes = Math.max(1, Math.round(settings.standSeconds / 60));
  const healthTooltip = useMemo(() => {
    const sitHours = todaySitMs / 3600000;
    const standMinutesRaw = todayStandMs / 60000;
    return [
      t('health_tooltip.title'),
      t('health_tooltip.formula'),
      t('health_tooltip.current', { sit: sitHours.toFixed(1), stand: Math.round(standMinutesRaw) }),
      t('health_tooltip.note'),
      t('health_tooltip.hint'),
    ].join('\n');
  }, [todaySitMs, todayStandMs, t]);

  const dailyFacts = useMemo(() => {
    const pad2 = (n: number) => n.toString().padStart(2, '0');
    const dayKeyFromTs = (ts: number) => {
      const d = new Date(ts);
      return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    };
    const pauseMinutes = logs
      .filter((x) => x.type === 'pause' && dayKeyFromTs(x.at) === todayKey)
      .map((x) => Number((x.payload as any)?.minutes))
      .filter((n) => Number.isFinite(n) && n > 0)
      .reduce((a, b) => a + b, 0);
    const excuses = logs
      .filter((x) => x.type === 'excuse')
      .map((x) => (x.payload as any)?.excuse)
      .filter((s) => typeof s === 'string' && s.trim())
      .slice(0, 12);
    const parts = [
      `${t('stats.today_stand_count')}: ${todayStandCount}`,
      `${t('stats.stand_work_count')}: ${day.standWorkCount}`,
      `${t('stats.today_sit')}: ${t('common.minutes', { count: Math.round(todaySitMs / 60000) })}`,
      `${t('stats.longest_sit')}: ${t('common.minutes', { count: Math.round(day.longestSitMs / 60000) })}`,
      `${t('stats.stand_duration')}: ${t('common.minutes', { count: Math.round(todayStandMs / 60000) })}`,
      `${t('status.standing_work')}: ${t('common.minutes', { count: Math.round(todayStandWorkMs / 60000) })}`,
      `${t('stats.ignore_count')}: ${day.ignoreCount}`,
      `${t('stats.excuse_count')}: ${day.excuseCount}`,
      `${t('stats.total_pause')}: ${t('common.minutes', { count: Math.round(pauseMinutes) })}`,
      `${t('health_tooltip.title')}: ${healthPctText}%`,
    ];
    if (excuses.length) {
      parts.push(t('stats.excuse_list'));
      parts.push(...excuses.map((e, i) => `${i + 1}. ${e}`));
    }
    return parts.join('\n');
  }, [
    day.excuseCount,
    day.ignoreCount,
    day.longestSitMs,
    day.standCount,
    day.standWorkCount,
    todayStandCount,
    healthPctText,
    logs,
    todayKey,
    todaySitMs,
    todayStandMs,
    todayStandWorkMs,
    t,
  ]);

  const aiExtra = useMemo(() => {
    const pad2 = (n: number) => n.toString().padStart(2, '0');
    const dayKeyFromTs = (ts: number) => {
      const d = new Date(ts);
      return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    };
    const todayPause = logs
      .filter((x) => x.type === 'pause' && dayKeyFromTs(x.at) === todayKey)
      .map((x) => Number((x.payload as any)?.minutes))
      .filter((n) => Number.isFinite(n) && n > 0)
      .reduce((a, b) => a + b, 0);
    const todayRow = `${todayKey} sit=${Math.round(todaySitMs / 60000)}m stand=${todayStandCount} standWork=${day.standWorkCount} standWorkMin=${Math.round(
      todayStandWorkMs / 60000,
    )} ignore=${day.ignoreCount} excuse=${day.excuseCount} pause=${Math.round(todayPause)}m`;
    const rows = [
      todayRow,
      ...(dayHistory ?? [])
        .slice(0, 6)
        .map(
          (h) =>
            `${h.dayKey} sit=${Math.round(h.totalSitMs / 60000)}m stand=${h.standCount + h.standWorkCount} standWork=${
              h.standWorkCount
            } standWorkMin=${Math.round(h.totalStandWorkMs / 60000)} ignore=${h.ignoreCount} excuse=${h.excuseCount} pause=${Math.round(h.pauseMinutes)}m`,
        ),
    ];
    return [t('stats.weekly_summary'), ...rows].join('\n');
  }, [
    day.excuseCount,
    day.ignoreCount,
    day.standCount,
    day.standWorkCount,
    dayHistory,
    logs,
    todayKey,
    todaySitMs,
    todayStandCount,
    todayStandWorkMs,
  ]);

  const generateDailyInsight = async (opts?: { closeAfter?: boolean }) => {
    if (!settings.aiEnabled) {
      setInsightModalOpen(true);
      setInsightDraft(t('ai.not_enabled'));
      return;
    }
    insightAbortRef.current?.abort();
    const aborter = new AbortController();
    insightAbortRef.current = aborter;
    setInsightModalOpen(true);
    setInsightLoading(true);
    setInsightDraft('');
    const baseNow = Date.now();
    const pad2 = (n: number) => n.toString().padStart(2, '0');
    const dayKeyFromTs = (ts: number) => {
      const d = new Date(ts);
      return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    };
    const todayPauseMinutes = logs
      .filter((x) => x.type === 'pause' && dayKeyFromTs(x.at) === todayKey)
      .map((x) => Number((x.payload as any)?.minutes))
      .filter((n) => Number.isFinite(n) && n > 0)
      .reduce((a, b) => a + b, 0);
    const messages = buildMomentC(
      {
        now: baseNow,
        appName: 'GetUpAI',
        mission: t('ai.mission'),
        personality: personalityFromStrictness(settings.aiStrictness),
        locale: i18n.language,
      },
      {
        mode,
        sitMinutes: Math.round(todaySitMs / 60000),
        standCount: todayStandCount,
        standMinutes: Math.round(todayStandMs / 60000),
        ignoreCount: day.ignoreCount,
        excuseCount: day.excuseCount,
        pauseMinutes: Math.round(todayPauseMinutes),
        longestSitMinutes: Math.round(day.longestSitMs / 60000),
        standWorkCount: day.standWorkCount,
        standWorkMinutes: Math.round(todayStandWorkMs / 60000),
        healthPct,
        extra: aiExtra,
      },
      dailyFacts,
    );
    try {
      const full = await aiChatStream(messages, (t) => setInsightDraft(t), aborter.signal);
      if (aborter.signal.aborted) return;
      const text = (full ?? '').trim();
      if (text) upsertDailyInsight(todayKey, baseNow, text);
      if (opts?.closeAfter && window.electronAPI?.closeMain) window.electronAPI.closeMain();
    } catch (error) {
      if (aborter.signal.aborted) return;
      const reason = error instanceof Error ? error.message : t('settings.test_fail');
      setInsightDraft(`AI generation failed: ${reason}`);
    } finally {
      if (!aborter.signal.aborted) setInsightLoading(false);
    }
  };
  // Sync auto-launch setting with system when settings modal opens
  useEffect(() => {
    if (!settingsModalOpen) return;
    let cancelled = false;
    (async () => {
      const api = window.electronAPI;
      if (!api?.getAutoLaunch) return;
      try {
        const systemEnabled = await api.getAutoLaunch();
        if (cancelled) return;
        // Sync system state to store
        if (settings.autoStartEnabled !== systemEnabled) {
          updateSettings({ autoStartEnabled: systemEnabled });
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsModalOpen]);

  useEffect(() => {
    if (!settingsModalOpen || settingsTab !== 'ai') return;
    let cancelled = false;
    setAiConfig(loadAiProviderConfigSync());
    setAiConfigNotice(null);
    (async () => {
      const apiKey = await loadAiApiKey();
      if (cancelled) return;
      setAiHasSavedKey(Boolean(apiKey));
      setAiApiKeyInput('');
    })();
    return () => {
      cancelled = true;
    };
  }, [settingsModalOpen, settingsTab]);

  useEffect(() => {
    if (!settingsModalOpen) return;
    setTopbarMoreOpen(false);
  }, [settingsModalOpen]);

  useEffect(() => {
    if (!topbarMoreOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (topbarMoreRef.current?.contains(target)) return;
      setTopbarMoreOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [topbarMoreOpen]);

  const saveAiConfig = async () => {
    const baseUrl = aiConfig.baseUrl.trim();
    const model = aiConfig.model.trim();
    const timeoutMs = clamp(Math.round(aiConfig.timeoutMs), 1000, 120000);
    if (!/^https?:\/\//.test(baseUrl) || !/chat\/completions/i.test(baseUrl)) {
      setAiConfigNoticeTone('error');
      setAiConfigNotice(t('settings.url_error'));
      return;
    }
    try {
      saveAiProviderConfigSync({ baseUrl, model, timeoutMs });
      if (aiApiKeyInput.trim()) {
        await saveAiApiKey(aiApiKeyInput.trim());
        setAiHasSavedKey(true);
        setAiApiKeyInput('');
      }
      setAiConfig({ baseUrl, model, timeoutMs });
      setAiConfigNoticeTone('ok');
      setAiConfigNotice(t('settings.save_success'));
    } catch {
      setAiConfigNoticeTone('error');
      setAiConfigNotice(t('settings.save_fail'));
    }
  };

  const clearSavedAiKey = async () => {
    try {
      await clearAiApiKey();
      setAiHasSavedKey(false);
      setAiApiKeyInput('');
      setAiConfigNoticeTone('ok');
      setAiConfigNotice(t('settings.clear_success'));
    } catch {
      setAiConfigNoticeTone('error');
      setAiConfigNotice(t('settings.clear_fail'));
    }
  };

  const testAiConnection = async () => {
    setAiTesting(true);
    setAiConfigNotice(null);
    try {
      saveAiProviderConfigSync({
        baseUrl: aiConfig.baseUrl.trim(),
        model: aiConfig.model.trim(),
        timeoutMs: clamp(Math.round(aiConfig.timeoutMs), 1000, 120000),
      });
      if (aiApiKeyInput.trim()) {
        await saveAiApiKey(aiApiKeyInput.trim());
        setAiHasSavedKey(true);
      }
      const text = await aiChat([{ role: 'user', content: 'Reply with OK only.' }]);
      setAiConfigNoticeTone('ok');
      setAiConfigNotice(text.trim() ? text.trim() : t('settings.test_success_empty'));
    } catch (error) {
      const reason = error instanceof Error ? error.message : t('settings.test_fail');
      setAiConfigNoticeTone('error');
      setAiConfigNotice(t('settings.test_fail_reason', { reason }));
    } finally {
      setAiTesting(false);
    }
  };

  const lastReminderAtRef = useRef(nextReminderAt);
  const notificationLevelRef = useRef(0);

  useEffect(() => {
    if (nextReminderAt !== lastReminderAtRef.current) {
        lastReminderAtRef.current = nextReminderAt;
        notificationLevelRef.current = 0;
        return; // Don't fire notifications on the same render as a reset
    }
    
    if (mode !== 'sitting' || settings.dndEnabled || isInRest(now, settings.restEnabled, settings.restWindows) || (pauseUntil && now < pauseUntil)) {
        return;
    }

    // 10 minutes left (600 seconds)
    if (reminderLeftSec <= 600 && reminderLeftSec > 300 && notificationLevelRef.current < 1) {
        if (settings.enablePreReminder && (window.electronAPI as any)?.showNotification) {
            (window.electronAPI as any).showNotification(t('notification.title'), t('notification.body_10m'));
        }
        notificationLevelRef.current = 1;
    }

    // 5 minutes left (300 seconds)
    if (reminderLeftSec <= 300 && reminderLeftSec > 0 && notificationLevelRef.current < 2) {
        if (settings.enablePreReminder) {
            setToastQueue(prev => [...prev, {
                id: `reminder-5m-${now}`,
                name: t('notification.get_ready'),
                description: t('notification.toast_body_5m'),
                icon: '⏰',
                type: 'reminder',
                customTitle: t('notification.toast_title')
            }]);
        }
        notificationLevelRef.current = 2;
    }
  }, [mode, now, reminderLeftSec, nextReminderAt, settings, pauseUntil]);

  useEffect(() => {
    if (mode !== 'sitting') return;
    if (restNow) return;
    if (settings.dndEnabled) return;
    if (reminderLeftSec !== 0) return;
    triggerReminder(now);
    if (window.electronAPI?.triggerPopup) window.electronAPI.triggerPopup();
  }, [mode, now, reminderLeftSec, restNow, settings.dndEnabled, triggerReminder]);

  const onStartStand = () => {
    if (mode !== 'sitting') return;
    startStanding(now);
    setStandModalOpen(true);
  };

  useEffect(() => {
    if (mode !== 'standing') return;
    if (!standEndsAt) return;
    if (standLeftSec > 0) return;
    finishStanding(now);
    setStandModalOpen(false);
  }, [finishStanding, mode, now, standEndsAt, standLeftSec]);

  const statusLabel =
    mode === 'paused'
      ? pauseReason === 'rest'
        ? t('status.resting')
        : pauseReason === 'dnd'
          ? t('status.dnd')
          : t('status.paused')
      : mode === 'standing'
        ? t('status.standing')
        : mode === 'standing_work'
          ? t('status.standing_work')
          : t('status.monitoring');
  const statusColor = mode === 'paused' ? '#ffcc00' : mode === 'standing' ? '#ff4444' : '#00ff88';
  const accent = mode === 'standing' ? '#ff4444' : mode === 'paused' ? '#ffcc00' : '#00ff88';
  const progress = mode === 'standing' ? standingPenaltyProgress : mode === 'sitting' ? sittingProgress : 0.4;
  const progressDeg = `${Math.round(progress * 360)}deg`;
  const win = useWindowSize();
  const isDesktop = win.width >= 860;
  const compact = !isDesktop && (win.width < 900 || win.height < 720);
  const desktopHeight = isDesktop ? win.height : 0;
  const desktopUltraTight = isDesktop && desktopHeight < 700;
  const desktopTight = isDesktop && desktopHeight < 820;
  const desktopRingSize = desktopUltraTight ? 188 : desktopTight ? 220 : 300;
  const desktopHeroGap = desktopUltraTight ? 12 : desktopTight ? 14 : 20;
  const desktopSectionGap = desktopUltraTight ? 10 : desktopTight ? 12 : 18;
  const desktopTileCompact = desktopTight;
  const ringSize = isDesktop ? 220 : compact ? 164 : 188;
  const statsCols = isDesktop ? 3 : win.width >= 400 ? 2 : 2;

  return (
    <div
      data-testid="dashboard-root"
      style={{
        height: '100vh',
        position: 'relative',
        ...({ WebkitAppRegion: 'drag' } as any),
        background:
          'radial-gradient(circle at 20% 10%, rgba(255,68,68,0.22), rgba(0,0,0,0) 45%), radial-gradient(circle at 80% 15%, rgba(0,255,136,0.12), rgba(0,0,0,0) 42%), linear-gradient(180deg, #070a10 0%, #05070a 60%, #030408 100%)',
        color: '#eaeaea',
        fontFamily: "'Segoe UI Variable', 'Segoe UI', system-ui, -apple-system, sans-serif",
        padding: isDesktop ? (desktopUltraTight ? 12 : desktopTight ? 16 : 24) : 14,
        paddingTop: isDesktop ? (desktopUltraTight ? 8 : 10) : 14,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 5, ...({ WebkitAppRegion: 'no-drag' } as any), zIndex: 9999 }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 5, ...({ WebkitAppRegion: 'no-drag' } as any), zIndex: 9999 }} />
      <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 5, ...({ WebkitAppRegion: 'no-drag' } as any), zIndex: 9999 }} />
      <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 5, ...({ WebkitAppRegion: 'no-drag' } as any), zIndex: 9999 }} />

      <OfflineBanner />

      {showAdaptiveNotification&& lastAdaptiveIntervalChange && (
        <div style={{
          position: 'absolute',
          top: isDesktop ? 60 : 50,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(255,204,0,0.16)',
          border: '1px solid rgba(255,204,0,0.30)',
          color: '#ffcc00',
          padding: '10px 15px',
          borderRadius: 10,
          fontSize: 12,
          fontWeight: 800,
          zIndex: 1000,
          textAlign: 'center',
          ...({ WebkitAppRegion: 'no-drag' } as any),
        }}>
          {t('adaptive_notification_message', {
            old: lastAdaptiveIntervalChange.oldInterval,
            new: lastAdaptiveIntervalChange.newInterval,
            reason: t(`adaptive_reason.${lastAdaptiveIntervalChange.reason}`)
          })}
        </div>
      )}

      <div
        data-testid="dashboard-topbar-row"
        style={{
          display: 'flex',
          flexDirection: isDesktop ? 'row' : 'column',
          gap: isDesktop ? 20 : 8,
          marginBottom: isDesktop ? (desktopTight ? 10 : 14) : 10,
          alignItems: isDesktop ? 'center' : 'stretch',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            ...({ WebkitAppRegion: 'drag' } as any),
            userSelect: 'none',
            flex: isDesktop ? 1 : 'none',
          }}
          >
          <div
            data-testid="dashboard-status-badge"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '7px 12px',
              borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.03)',
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: statusColor,
                boxShadow: `0 0 8px ${statusColor}`,
              }}
            />
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.92)', fontWeight: 800, letterSpacing: 0.15 }}>
              GetUp.ai
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.52)', fontWeight: 700 }}>
              {statusLabel}
            </div>
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
            justifyContent: 'flex-end',
            ...({ WebkitAppRegion: 'no-drag' } as any),
            position: 'relative',
          }}
        >
          <div
            data-testid="dashboard-topbar-core"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: 3,
              borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(9,12,18,0.42)',
              boxShadow: '0 14px 34px rgba(0,0,0,0.24)',
              ...({ WebkitAppRegion: 'no-drag' } as any),
            }}
          >
            <div
              style={{
                height: 30,
                padding: '0 9px',
                borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.03)',
                color: 'rgba(255,255,255,0.60)',
                fontSize: 12,
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                boxSizing: 'border-box',
              }}
            >
              {settings.intervalMinutes} min
            </div>

            {mode === 'paused' && pauseReason === 'rest' ? (
              <HeaderButton
                onClick={() => {
                  endRestEarly(now);
                }}
                style={{ borderColor: 'rgba(0,255,136,0.30)', color: '#00ff88' }}
              >
                {t('header.end_rest')}
              </HeaderButton>
            ) : null}

            <HeaderIconButton
              title={settings.dndEnabled ? t('header.dnd_off') : t('header.dnd_on')}
              onClick={() => {
                if (settings.dndEnabled) disableDnd(now);
                else enableDnd(now);
              }}
              style={{
                borderColor: settings.dndEnabled ? 'rgba(255,204,0,0.30)' : undefined,
                color: settings.dndEnabled ? '#ffcc00' : undefined,
                background: settings.dndEnabled
                  ? 'linear-gradient(180deg, rgba(255,204,0,0.16), rgba(255,255,255,0.03))'
                  : undefined,
              }}
            >
              <Icon name="moon" size={16} />
            </HeaderIconButton>

            <SyncStatusIndicator />

            <HeaderIconButton
              data-testid="btn-settings"
              title={t('header.settings')}
              onClick={() => {
                setSettingsTab('general');
                setSettingsModalOpen(true);
              }}
            >
              <Icon name="gear" size={16} />
            </HeaderIconButton>

            <div ref={topbarMoreRef} style={{ position: 'relative' }}>
              {topbarMoreOpen ? (
                <div
                  data-testid="dashboard-topbar-overlay"
                  onMouseDown={() => setTopbarMoreOpen(false)}
                  style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 9,
                    background: 'transparent',
                    ...({ WebkitAppRegion: 'no-drag' } as any),
                  }}
                />
              ) : null}
              <HeaderIconButton
                data-testid="dashboard-topbar-more"
                title="More"
                onClick={() => setTopbarMoreOpen((v) => !v)}
              >
                <MoreIcon size={16} color="rgba(255,255,255,0.85)" />
              </HeaderIconButton>
              {topbarMoreOpen ? (
                <div
                  data-testid="dashboard-topbar-menu"
                  role="menu"
                  style={{
                    position: 'absolute',
                    top: 42,
                    right: 0,
                    minWidth: 210,
                    padding: 6,
                    borderRadius: 16,
                    border: '1px solid rgba(255,255,255,0.10)',
                    background: 'linear-gradient(180deg, rgba(18,22,30,0.98), rgba(9,12,18,0.96))',
                    boxShadow: '0 28px 70px rgba(0,0,0,0.48)',
                    display: 'grid',
                    gap: 4,
                    zIndex: 10,
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <HeaderButton
                    title={t('header.daily_insight')}
                    onClick={() => {
                      setTopbarMoreOpen(false);
                      generateDailyInsight();
                    }}
                    style={{ justifyContent: 'flex-start', width: '100%', background: 'transparent', boxShadow: 'none', borderColor: 'transparent' }}
                  >
                    <Icon name="spark" size={14} />
                    {t('header.daily_insight')}
                  </HeaderButton>
                  <HeaderButton
                    title={t('header.stats')}
                    onClick={() => {
                      setTopbarMoreOpen(false);
                      setDataModalOpen(true);
                    }}
                    style={{ justifyContent: 'flex-start', width: '100%', background: 'transparent', boxShadow: 'none', borderColor: 'transparent' }}
                  >
                    <Icon name="chart" size={14} />
                    {t('header.stats')}
                  </HeaderButton>
                  <HeaderButton
                    title={t('header.share')}
                    onClick={() => {
                      setTopbarMoreOpen(false);
                      setShareModalOpen(true);
                    }}
                    style={{ justifyContent: 'flex-start', width: '100%', background: 'transparent', boxShadow: 'none', borderColor: 'transparent' }}
                  >
                    <Icon name="share" size={14} />
                    {t('header.share')}
                  </HeaderButton>
                  <HeaderButton
                    title={t('header.force_popup')}
                    onClick={() => {
                      setTopbarMoreOpen(false);
                      if (window.electronAPI?.triggerPopup) window.electronAPI.triggerPopup();
                    }}
                    style={{ justifyContent: 'flex-start', width: '100%', background: 'transparent', boxShadow: 'none', borderColor: 'transparent' }}
                  >
                    <Icon name="beaker" size={14} />
                    {t('header.force_popup')}
                  </HeaderButton>
                </div>
              ) : null}
            </div>
          </div>

            <div
              data-testid="dashboard-window-controls"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                paddingLeft: 4,
                ...({ WebkitAppRegion: 'no-drag' } as any),
              }}
            >

            {window.electronAPI?.minimizeMain ? (
              <HeaderIconButton
                title={t('header.minimize')}
                onClick={() => {
                  window.electronAPI?.minimizeMain?.();
                }}
              >
                <Icon name="min" size={16} />
              </HeaderIconButton>
            ) : null}

            {window.electronAPI?.closeMain ? (
              <HeaderIconButton
                title={t('header.close')}
                onClick={() => {
                  window.electronAPI?.closeMain?.();
                }}
                tone="danger"
              >
                <Icon name="close" size={16} />
              </HeaderIconButton>
            ) : null}
          </div>
        </div>
      </div>

      <div
        data-testid="dashboard-main-content"
        style={{
          width: '100%',
          maxWidth: 1040,
          margin: '0 auto',
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflowY: isDesktop ? 'hidden' : 'auto',
          overflowX: 'hidden',
          gap: isDesktop ? (desktopTight ? 18 : 40) : 10,
          paddingBottom: isDesktop ? (desktopTight ? 8 : 20) : 0,
        }}
      >
        <div
          style={{
            flex: 'none',
            display: isDesktop ? 'none' : 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            alignItems: 'center',
            overflow: 'hidden',
            paddingBottom: isDesktop ? 0 : 0,
          }}
        >
          {!isDesktop && (
            <div
              style={{
                width: '100%',
                flex: 1,
                overflowY: 'auto',
                ...({ WebkitAppRegion: 'no-drag' } as any),
                paddingBottom: 14,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  borderRadius: 22,
                  border: '1px solid rgba(255,255,255,0.10)',
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))',
                  padding: 12,
                  boxShadow: '0 0 30px rgba(0,0,0,0.45)',
                  minHeight: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  marginBottom: 10,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 2, marginBottom: 8 }}>
                  <div
                    style={{
                      width: ringSize,
                      height: ringSize,
                      borderRadius: 999,
                      boxSizing: 'border-box',
                      background: `conic-gradient(from -90deg, ${accent} 0deg ${progressDeg}, rgba(255,255,255,0.08) ${progressDeg} 360deg)`,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      boxShadow: '0 26px 60px rgba(0,0,0,0.55)',
                      padding: 6,
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: 999,
                        background:
                          'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.10), rgba(0,0,0,0) 55%), linear-gradient(180deg, rgba(10,12,16,0.9), rgba(6,7,10,0.9))',
                        border: '1px solid rgba(255,255,255,0.08)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <div
                        style={{
                          fontSize: compact ? (centerValue.length > 5 ? 28 : 42) : centerValue.length > 5 ? 34 : 48,
                          fontWeight: 950,
                          letterSpacing: 1,
                          fontVariantNumeric: 'tabular-nums',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {centerValue}
                      </div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.52)', letterSpacing: 0.4 }}>
                        {mode === 'sitting'
                          ? t('countdown.next_punishment')
                          : mode === 'paused'
                            ? pauseReason === 'rest'
                              ? t('countdown.rest')
                              : pauseReason === 'dnd'
                                ? t('countdown.dnd')
                                : t('countdown.pause')
                            : mode === 'standing_work'
                              ? t('countdown.standing_work')
                              : t('countdown.punishment')}
                      </div>
                      <div style={{ marginTop: 6, fontSize: 11, color: 'rgba(255,255,255,0.38)' }}>
                        {mode === 'sitting'
                          ? formatPercent(sittingProgress * 100)
                          : mode === 'standing'
                            ? formatPercent(standingPenaltyProgress * 100)
                            : mode === 'paused' && pauseUntil
                              ? formatRelativeTime(now, pauseUntil)
                              : '—'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: compact ? 6 : 8 }}>
                <StatTile compact={compact} label={t('stats.today_stand_count')} value={t('common.times', { count: todayStandCount })} tone={todayStandCount >= 6 ? 'good' : 'normal'} />
                <StatTile
                  compact={compact}
                  label={t('stats.spine_health')}
                  value={`${healthPctText}%`}
                  tone={healthTone}
                  sub={
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <span>{healthPct >= 80 ? t('stats.safe') : healthPct >= 50 ? t('stats.warning') : t('stats.danger')}</span>
                      <span
                        title={healthTooltip}
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: 999,
                          border: '1px solid rgba(255,255,255,0.18)',
                          color: 'rgba(255,255,255,0.65)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 10,
                          fontWeight: 900,
                          cursor: 'help',
                          userSelect: 'none',
                        }}
                      >
                        i
                      </span>
                    </span>
                  }
                />
              </div>

              <div style={{ marginTop: 10 }}>
                <PrimaryButton data-testid="btn-stand-active" onClick={onStartStand} disabled={mode !== 'sitting'} style={{ width: '100%' }}>
                  {t('actions.stand_active_with_min', { minutes: Math.floor(settings.standSeconds / 60) })}
                </PrimaryButton>
              </div>

              <div style={{ marginTop: 10 }}>
                <StatsDrawer label={t('stats.more_data')} defaultOpen={true}>
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${statsCols}, 1fr)`, gap: compact ? 6 : 8 }}>
                    <StatTile
                      compact={compact}
                      label={t('stats.last_stand')}
                      value={lastStandRelative}
                      tone={lastStandDanger ? 'danger' : 'normal'}
                      sub={day.lastStandAt ? new Date(day.lastStandAt).toLocaleTimeString() : t('stats.no_record')}
                    />
                    <StatTile compact={compact} label={t('stats.today_sit')} value={formatDurationShort(todaySitMs)} tone={todaySitMs > 4 * 3600000 ? 'warn' : 'normal'} />
                    <StatTile compact={compact} label={t('stats.longest_sit')} value={formatDurationShort(Math.max(day.longestSitMs, currentSitMs))} tone={currentSitMs > 2 * 3600000 ? 'danger' : 'normal'} />
                    <StatTile compact={compact} label={t('stats.excuse_count')} value={t('common.times', { count: day.excuseCount })} tone={day.excuseCount >= 3 ? 'warn' : 'normal'} />
                    <StatTile
                      compact={compact}
                      label={t('stats.stand_work_count')}
                      value={t('common.times', { count: day.standWorkCount })}
                      tone={day.standWorkCount >= 2 ? 'good' : 'normal'}
                      sub={`${formatDurationShort(todayStandWorkMs)}${mode === 'standing_work' ? ` · ${t('stats.stand_work_current')} ${formatDurationShort(currentStandWorkMs)}` : ''}`}
                    />
                    <AchievementCard
                      compact={compact}
                      streakDays={achievements.streakDays}
                      unlockedCount={unlockedCount}
                      totalCount={ACHIEVEMENTS.length}
                      latestAchievement={latestAchievement}
                      onClick={() => setAchievementModalOpen(true)}
                    />
                  </div>
                  <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <GhostButton
                      onClick={() => {
                        if (window.electronAPI?.triggerPopup) window.electronAPI.triggerPopup();
                      }}
                      disabled={mode === 'standing'}
                    >
                      {t('actions.appeal')}
                    </GhostButton>
                    <GhostButton
                      data-testid="btn-pause"
                      onClick={() => setPauseModalOpen(true)}
                      disabled={mode === 'standing'}
                      style={{ opacity: mode === 'standing' ? 0.5 : 1 }}
                    >
                      {t('actions.pause')}
                    </GhostButton>
                  </div>
                </StatsDrawer>
              </div>
            </div>
          )}


        </div>

        {isDesktop && (
          <div
            data-testid="dashboard-desktop-layout"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: desktopSectionGap,
              flex: 1,
              minHeight: 0,
              justifyContent: 'space-between',
              paddingBottom: desktopTight ? 4 : 8,
            }}
          >
            <div
              data-testid="dashboard-focus-hero"
              style={{
                display: 'grid',
                gridTemplateColumns: desktopTight ? '140px minmax(0, 1fr) 140px' : '160px minmax(0, 1fr) 160px',
                alignItems: 'center',
                gap: desktopHeroGap,
                flex: desktopStatsOpen ? 'none' : 1,
                minHeight: 0,
              }}
            >
              <div
                data-testid="dashboard-side-stats"
                style={{ display: 'grid', gap: 12, alignSelf: 'center', ...({ WebkitAppRegion: 'no-drag' } as any) }}
              >
                <StatTile label={t('stats.today_stand_count')} value={t('common.times', { count: todayStandCount })} tone={todayStandCount >= 6 ? 'good' : 'normal'} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, minWidth: 0 }}>
                <div
                  data-testid="dashboard-focus-ring"
                  style={{
                    width: desktopRingSize,
                    maxWidth: '100%',
                    aspectRatio: '1/1',
                    borderRadius: 999,
                    boxSizing: 'border-box',
                    background: `conic-gradient(from -90deg, ${accent} 0deg ${progressDeg}, rgba(255,255,255,0.08) ${progressDeg} 360deg)`,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    boxShadow: '0 44px 100px rgba(0,0,0,0.58)',
                    padding: 10,
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: 999,
                      background:
                        'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.10), rgba(0,0,0,0) 55%), linear-gradient(180deg, rgba(10,12,16,0.94), rgba(6,7,10,0.94))',
                      border: '1px solid rgba(255,255,255,0.08)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.48)', letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 12 }}>
                      {mode === 'sitting'
                        ? t('countdown.next_punishment_short')
                        : mode === 'paused'
                          ? pauseReason === 'rest'
                            ? t('countdown.rest_short')
                            : pauseReason === 'dnd'
                              ? t('countdown.dnd_short')
                              : t('countdown.pause_short')
                          : mode === 'standing_work'
                            ? t('countdown.standing_work')
                            : t('countdown.punishment_short')}
                    </div>
                    <div
                      style={{
                        fontSize: desktopUltraTight ? (centerValue.length > 5 ? 30 : 44) : desktopTight ? (centerValue.length > 5 ? 34 : 50) : centerValue.length > 5 ? 42 : 64,
                        fontWeight: 950,
                        letterSpacing: 1.4,
                        fontVariantNumeric: 'tabular-nums',
                        whiteSpace: 'nowrap',
                        lineHeight: 1,
                      }}
                    >
                      {centerValue}
                    </div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.52)', letterSpacing: 0.4, marginTop: 12 }}>
                      {mode === 'sitting'
                        ? formatPercent(sittingProgress * 100)
                        : mode === 'standing'
                          ? formatPercent(standingPenaltyProgress * 100)
                          : mode === 'paused' && pauseUntil
                            ? formatRelativeTime(now, pauseUntil)
                            : '—'}
                    </div>
                  </div>
                </div>

                <div data-testid="dashboard-primary-action-wrap" style={{ marginBottom: desktopTight ? 8 : 20 }}>
                  <PrimaryButton
                    data-testid="dashboard-primary-action"
                    onClick={onStartStand}
                    disabled={mode !== 'sitting'}
                    style={{ width: desktopTight ? 156 : 170, fontSize: desktopTight ? 13 : 14, padding: desktopTight ? '12px 16px' : '14px 20px', borderRadius: 999 }}
                  >
                    {t('actions.stand_active')}
                  </PrimaryButton>
                </div>
              </div>

              <div style={{ display: 'grid', gap: 12, alignSelf: 'center', ...({ WebkitAppRegion: 'no-drag' } as any) }}>
                <StatTile
                  label={t('stats.spine_health')}
                  value={`${healthPctText}%`}
                  tone={healthTone}
                  sub={
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <span>{healthPct >= 80 ? t('stats.safe') : healthPct >= 50 ? t('stats.warning') : t('stats.danger')}</span>
                      <span
                        title={healthTooltip}
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: 999,
                          border: '1px solid rgba(255,255,255,0.18)',
                          color: 'rgba(255,255,255,0.65)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 10,
                          fontWeight: 900,
                          cursor: 'help',
                          userSelect: 'none',
                        }}
                      >
                        i
                      </span>
                    </span>
                  }
                />
              </div>
            </div>

            <div style={{ width: '100%', marginTop: 4, ...({ WebkitAppRegion: 'no-drag' } as any) }}>
            <StatsDrawer
              label={t('stats.more_data')}
              defaultOpen={true}
              open={desktopStatsOpen}
              onOpenChange={setDesktopStatsOpen}
              testId="dashboard-more-data"
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: desktopTight ? 10 : 12 }}>
                <StatTile
                  compact={desktopTileCompact}
                  label={t('stats.last_stand')}
                  value={lastStandRelative}
                  tone={lastStandDanger ? 'danger' : 'normal'}
                  sub={day.lastStandAt ? new Date(day.lastStandAt).toLocaleTimeString() : t('stats.no_record')}
                />
                <StatTile compact={desktopTileCompact} label={t('stats.today_sit')} value={formatDurationShort(todaySitMs)} tone={todaySitMs > 4 * 3600000 ? 'warn' : 'normal'} />
                <StatTile compact={desktopTileCompact} label={t('stats.longest_sit')} value={formatDurationShort(Math.max(day.longestSitMs, currentSitMs))} tone={currentSitMs > 2 * 3600000 ? 'danger' : 'normal'} />
                <StatTile compact={desktopTileCompact} label={t('stats.excuse_count')} value={t('common.times', { count: day.excuseCount })} tone={day.excuseCount >= 3 ? 'warn' : 'normal'} />
                <StatTile
                  compact={desktopTileCompact}
                  label={t('stats.stand_work_count')}
                  value={t('common.times', { count: day.standWorkCount })}
                  tone={day.standWorkCount >= 2 ? 'good' : 'normal'}
                  sub={`${formatDurationShort(todayStandWorkMs)}${mode === 'standing_work' ? ` · ${t('stats.stand_work_current')} ${formatDurationShort(currentStandWorkMs)}` : ''}`}
                />
                <AchievementCard
                  compact={desktopTileCompact}
                  streakDays={achievements.streakDays}
                  unlockedCount={unlockedCount}
                  totalCount={ACHIEVEMENTS.length}
                  latestAchievement={latestAchievement}
                  onClick={() => setAchievementModalOpen(true)}
                />
              </div>
              <div data-testid="dashboard-more-data-actions" style={{ marginTop: desktopTight ? 10 : 12, display: 'flex', gap: desktopTight ? 10 : 12 }}>
                <GhostButton
                  onClick={() => {
                    if (mode === 'standing_work') stopStandingWork(now);
                    else if (mode === 'sitting') startStandingWork(now);
                  }}
                  disabled={mode === 'standing' || mode === 'paused'}
                  style={{
                    flex: 1,
                    fontSize: 13,
                    opacity: mode === 'standing' || mode === 'paused' ? 0.5 : 1,
                    borderColor: mode === 'standing_work' ? 'rgba(0,255,136,0.28)' : 'rgba(255,255,255,0.12)',
                    color: mode === 'standing_work' ? '#00ff88' : 'rgba(255,255,255,0.9)',
                  }}
                >
                  {mode === 'standing_work' ? `🧍 ${t('status.standing_work')} (${formatDurationShort(currentStandWorkMs)})` : `🧍 ${t('status.standing_work')}`}
                </GhostButton>
                <GhostButton
                  onClick={() => setPauseModalOpen(true)}
                  disabled={mode === 'standing'}
                  style={{ opacity: mode === 'standing' ? 0.5 : 1, flex: 1, fontSize: 13 }}
                >
                  {t('actions.pause')}
                </GhostButton>
              </div>
            </StatsDrawer>
            </div>
          </div>
        )}
      </div>

      {dataModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, ...({ WebkitAppRegion: 'no-drag' } as any) }}>
          <DataModal
            open={dataModalOpen}
            onClose={() => setDataModalOpen(false)}
            history={dayHistory}
            currentDay={day}
            logs={logs}
          />
        </div>
      )}

      {shareModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, ...({ WebkitAppRegion: 'no-drag' } as any) }}>
          <ShareModal
            open={shareModalOpen}
            onClose={() => setShareModalOpen(false)}
          />
        </div>
      )}

      <Modal
        open={standModalOpen}
        title={t('modal.punishment_title')}
        onClose={() => {
          setStandModalOpen(false);
        }}
      >
        <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, lineHeight: 1.6 }}>
          {t('modal.punishment_content')}
        </div>
        <div style={{ marginTop: 14, fontSize: 32, fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>
          {formatHMS(Math.max(0, standLeftSec))}
        </div>
        <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
          <GhostButton
            onClick={() => {
              cancelStanding(now);
              setStandModalOpen(false);
            }}
            style={{ flex: 1 }}
          >
            {t('modal.sit_back')}
          </GhostButton>
        </div>
      </Modal>

      <Modal open={pauseModalOpen} title={t('modal.pause_title')} onClose={() => setPauseModalOpen(false)}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {[15, 30, 60].map((m) => (
            <GhostButton
              key={m}
              onClick={() => {
                pauseForMinutes(now, m);
                setPauseModalOpen(false);
              }}
            >
              {t('common.minutes', { count: m })}
            </GhostButton>
          ))}
        </div>
        <div style={{ marginTop: 12, fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
          {t('modal.pause_note')}
        </div>
      </Modal>

      <Modal open={insightModalOpen} title={t('modal.insight_title')} width={720} onClose={() => setInsightModalOpen(false)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <PrimaryButton onClick={() => generateDailyInsight()} disabled={insightLoading} style={{ flex: 1 }}>
              {insightLoading ? t('modal.generating') : t('modal.generate')}
            </PrimaryButton>
            <GhostButton
              onClick={() => generateDailyInsight({ closeAfter: true })}
              disabled={insightLoading || !window.electronAPI?.closeMain}
              style={{ flex: 1, opacity: insightLoading || !window.electronAPI?.closeMain ? 0.5 : 1 }}
            >
              {t('modal.generate_exit')}
            </GhostButton>
          </div>
          <div
            style={{
              padding: 14,
              borderRadius: 14,
              border: '1px solid rgba(255,255,255,0.10)',
              background: 'rgba(0,0,0,0.22)',
              color: 'rgba(255,255,255,0.92)',
              fontSize: 13,
              lineHeight: 1.7,
              whiteSpace: 'pre-wrap',
              minHeight: 120,
            }}
          >
            {insightDraft.trim()
              ? insightDraft.trim()
              : aiInsightLatest?.dayKey === todayKey
                ? aiInsightLatest.text
                : t('modal.insight_empty')}
          </div>
          {aiInsightHistory?.length ? (
            <div style={{ marginTop: 4 }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginBottom: 8 }}>{t('modal.insight_history', { count: Math.min(14, aiInsightHistory.length) })}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflow: 'auto' }}>
                {aiInsightHistory.map((x) => (
                  <div
                    key={x.dayKey}
                    style={{
                      padding: 10,
                      borderRadius: 12,
                      border: '1px solid rgba(255,255,255,0.08)',
                      background: 'rgba(255,255,255,0.03)',
                      color: 'rgba(255,255,255,0.88)',
                      fontSize: 12,
                      lineHeight: 1.6,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginBottom: 6 }}>{x.dayKey}</div>
                    {x.text}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </Modal>

      <Modal open={settingsModalOpen} title={t('settings.title')} width={560} onClose={() => setSettingsModalOpen(false)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <GhostButton
              onClick={() => setSettingsTab('general')}
              style={{
                padding: '10px 12px',
                fontSize: 12,
                borderRadius: 12,
                borderColor: settingsTab === 'general' ? 'rgba(0,255,136,0.35)' : 'rgba(255,255,255,0.12)',
                color: settingsTab === 'general' ? '#00ff88' : 'rgba(255,255,255,0.85)',
                flex: 1,
              }}
            >
              {t('settings.tab_general')}
            </GhostButton>
            <GhostButton
              onClick={() => setSettingsTab('ai')}
              style={{
                padding: '10px 12px',
                fontSize: 12,
                borderRadius: 12,
                borderColor: settingsTab === 'ai' ? 'rgba(0,255,136,0.35)' : 'rgba(255,255,255,0.12)',
                color: settingsTab === 'ai' ? '#00ff88' : 'rgba(255,255,255,0.85)',
                flex: 1,
              }}
            >
              {t('settings.tab_ai')}
            </GhostButton>
          </div>

          {settingsTab === 'general' ? (
            <div>
              <div
                style={{
                  marginBottom: 14,
                  padding: 12,
                  borderRadius: 14,
                  border: '1px solid rgba(255,255,255,0.10)',
                  background: 'rgba(0,0,0,0.20)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 800 }}>{t('settings.language')}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <GhostButton
                    onClick={() => updateSettings({ language: 'zh' })}
                    style={{
                      flex: 1,
                      fontSize: 12,
                      padding: '8px',
                      borderColor: settings.language === 'zh' ? 'rgba(0,255,136,0.35)' : 'rgba(255,255,255,0.12)',
                      color: settings.language === 'zh' ? '#00ff88' : 'rgba(255,255,255,0.85)',
                    }}
                  >
                    简体中文
                  </GhostButton>
                  <GhostButton
                    onClick={() => updateSettings({ language: 'en' })}
                    style={{
                      flex: 1,
                      fontSize: 12,
                      padding: '8px',
                      borderColor: settings.language === 'en' ? 'rgba(0,255,136,0.35)' : 'rgba(255,255,255,0.12)',
                      color: settings.language === 'en' ? '#00ff88' : 'rgba(255,255,255,0.85)',
                    }}
                  >
                    English
                  </GhostButton>
                </div>
              </div>

              <div
                style={{
                  marginTop: 14,
                  padding: 12,
                  borderRadius: 14,
                  border: '1px solid rgba(255,255,255,0.10)',
                  background: 'rgba(0,0,0,0.20)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 800 }}>{t('settings.auto_start')}</div>
                    <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, marginTop: 2 }}>{t('settings.auto_start_description')}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.autoStartEnabled}
                    onChange={async (e) => {
                      const enabled = e.target.checked;
                      updateSettings({ autoStartEnabled: enabled });
                      // Sync with system auto-launch setting
                      if (window.electronAPI?.setAutoLaunch) {
                        try {
                          await window.electronAPI.setAutoLaunch(enabled);
                        } catch {}
                      }
                    }}
                    style={{ transform: 'scale(1.1)' }}
                  />
                </div>
              </div>

              <div
                style={{
                  marginTop: 14,
                  padding: 12,
                  borderRadius: 14,
                  border: '1px solid rgba(255,255,255,0.10)',
                  background: 'rgba(0,0,0,0.20)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 800 }}>{t('settings.dnd_periods')}</div>
                  <input
                    type="checkbox"
                    checked={settings.restEnabled}
                    onChange={(e) => updateSettings({ restEnabled: e.target.checked })}
                    style={{ transform: 'scale(1.1)' }}
                  />
                </div>

                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {restWindows.map((w) => (
                    <div
                      key={w.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'auto 1fr 1fr auto',
                        gap: 10,
                        alignItems: 'center',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={w.enabled}
                        onChange={(e) => {
                          const next = restWindows.map((x) => (x.id === w.id ? { ...x, enabled: e.target.checked } : x));
                          updateSettings({ restWindows: next });
                        }}
                      />
                      <input
                        type="time"
                        value={minuteToTime(w.startMinute)}
                        onChange={(e) => {
                          const v = timeToMinute(e.target.value);
                          if (v === null) return;
                          const next = restWindows.map((x) => (x.id === w.id ? { ...x, startMinute: v } : x));
                          updateSettings({ restWindows: next });
                        }}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 12,
                          border: '1px solid rgba(255,255,255,0.14)',
                          background: 'rgba(0,0,0,0.22)',
                          color: 'rgba(255,255,255,0.9)',
                          boxSizing: 'border-box',
                        }}
                      />
                      <input
                        type="time"
                        value={minuteToTime(w.endMinute)}
                        onChange={(e) => {
                          const v = timeToMinute(e.target.value);
                          if (v === null) return;
                          const next = restWindows.map((x) => (x.id === w.id ? { ...x, endMinute: v } : x));
                          updateSettings({ restWindows: next });
                        }}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 12,
                          border: '1px solid rgba(255,255,255,0.14)',
                          background: 'rgba(0,0,0,0.22)',
                          color: 'rgba(255,255,255,0.9)',
                          boxSizing: 'border-box',
                        }}
                      />
                      <GhostButton
                        onClick={() => {
                          const next = restWindows.filter((x) => x.id !== w.id);
                          updateSettings({ restWindows: next.length ? next : restWindows });
                        }}
                        style={{ padding: '10px 10px' }}
                        disabled={restWindows.length <= 1}
                      >
                        {t('settings.delete')}
                      </GhostButton>
                    </div>
                  ))}

                  <GhostButton
                    onClick={() => {
                      const next = [
                        ...restWindows,
                        { id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, enabled: true, startMinute: 12 * 60, endMinute: 13 * 60 },
                      ];
                      updateSettings({ restWindows: next });
                    }}
                  >
                    {t('settings.add_period')}
                  </GhostButton>
                </div>

                <div style={{ marginTop: 10, fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
                  {t('settings.dnd_note')}
                </div>
              </div>

              <div
                style={{
                  marginTop: 14,
                  padding: 12,
                  borderRadius: 14,
                  border: '1px solid rgba(255,255,255,0.10)',
                  background: 'rgba(0,0,0,0.20)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 800 }}>{t('settings.away_detection')}</div>
                </div>
                 
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>{t('settings.auto_pause_lock')}</div>
                  <input
                    type="checkbox"
                    checked={settings.lockScreenPauseEnabled}
                    onChange={(e) => updateSettings({ lockScreenPauseEnabled: e.target.checked })}
                    style={{ transform: 'scale(1.1)' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>{t('settings.auto_pause_idle')}</div>
                  <input
                    type="checkbox"
                    checked={settings.idleDetectionEnabled}
                    onChange={(e) => updateSettings({ idleDetectionEnabled: e.target.checked })}
                    style={{ transform: 'scale(1.1)' }}
                  />
                </div>
                
                {settings.idleDetectionEnabled && (
                    <div style={{ marginTop: 10 }}>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginBottom: 6 }}>{t('settings.idle_threshold', { count: settings.idleThresholdMinutes })}</div>
                        <input
                            type="range"
                            min={1}
                            max={60}
                            step={1}
                            value={settings.idleThresholdMinutes}
                            onChange={(e) => {
                                const v = Number(e.target.value);
                                if (!Number.isFinite(v)) return;
                                updateSettings({ idleThresholdMinutes: clamp(Math.round(v), 1, 60) });
                            }}
                            style={{ width: '100%' }}
                        />
                         <div style={{ marginTop: 6, fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
                            {t('settings.idle_note')}
                        </div>
                    </div>
                )}
              </div>

              <div
                style={{
                  marginTop: 14,
                  padding: 12,
                  borderRadius: 14,
                  border: '1px solid rgba(255,255,255,0.10)',
                  background: 'rgba(0,0,0,0.20)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 800 }}>{t('settings.force_stand_duration')}</div>
                  <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, fontWeight: 800 }}>{standMinutes} min</div>
                </div>
                <input
                  type="range"
                  min={1}
                  max={30}
                  step={1}
                  value={standMinutes}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (!Number.isFinite(v)) return;
                    updateSettings({ standSeconds: clamp(Math.round(v), 1, 30) * 60 });
                  }}
                  style={{ width: '100%' }}
                />
                <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                  {[2, 3, 5, 8, 10].map((m) => (
                    <GhostButton
                      key={m}
                      onClick={() => updateSettings({ standSeconds: m * 60 })}
                      style={{
                        padding: '10px 10px',
                        borderColor: standMinutes === m ? 'rgba(0,255,136,0.32)' : 'rgba(255,255,255,0.12)',
                        color: standMinutes === m ? '#00ff88' : 'rgba(255,255,255,0.85)',
                      }}
                    >
                      {m}min
                    </GhostButton>
                  ))}
                </div>
                <div style={{ marginTop: 10, fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
                  {t('settings.force_stand_note')}
                </div>
              </div>

              <div
                style={{
                  marginTop: 14,
                  padding: 12,
                  borderRadius: 14,
                  border: '1px solid rgba(255,255,255,0.10)',
                  background: 'rgba(0,0,0,0.20)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 800 }}>{t('settings.reminder_strategy')}</div>
                </div>
                 <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    <GhostButton
                        onClick={() => updateSettings({ reminderStrategy: 'fixed' })}
                        style={{
                            flex: 1,
                            borderColor: settings.reminderStrategy === 'fixed' ? 'rgba(0,255,136,0.35)' : 'rgba(255,255,255,0.12)',
                            color: settings.reminderStrategy === 'fixed' ? '#00ff88' : 'rgba(255,255,255,0.85)',
                        }}
                    >
                        {t('settings.strategy_fixed')}
                    </GhostButton>
                    <GhostButton
                        onClick={() => updateSettings({ reminderStrategy: 'adaptive' })}
                        style={{
                            flex: 1,
                            borderColor: settings.reminderStrategy === 'adaptive' ? 'rgba(0,255,136,0.35)' : 'rgba(255,255,255,0.12)',
                            color: settings.reminderStrategy === 'adaptive' ? '#00ff88' : 'rgba(255,255,255,0.85)',
                        }}
                    >
                        {t('settings.strategy_adaptive')}
                    </GhostButton>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 800 }}>{t('settings.pre_reminder')}</div>
                  <input
                    type="checkbox"
                    checked={settings.enablePreReminder}
                    onChange={(e) => updateSettings({ enablePreReminder: e.target.checked })}
                    style={{ transform: 'scale(1.1)' }}
                  />
                </div>
                <div style={{ marginTop: 6, fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
                  {t('settings.adaptive_note')}
                </div>
              </div>

              <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                {[20, 30, 60].map((m) => (
                  <GhostButton
                    key={m}
                    onClick={() => {
                      pauseForMinutes(now, m);
                      setSettingsModalOpen(false);
                    }}
                  >
                    {t('settings.quick_rest', { count: m })}
                  </GhostButton>
                ))}
              </div>
            </div>
          ) : null}

          {settingsTab === 'ai' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.03)',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 900, color: 'rgba(255,255,255,0.9)' }}>{t('settings.enable_ai')}</div>
                <input
                  type="checkbox"
                  checked={settings.aiEnabled}
                  onChange={(e) => updateSettings({ aiEnabled: e.target.checked })}
                  style={{ width: 18, height: 18 }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {[1, 2, 3].map((level) => (
                  <GhostButton
                    key={level}
                    onClick={() => updateSettings({ aiStrictness: level as 1 | 2 | 3 })}
                    style={{
                      borderColor: settings.aiStrictness === level ? 'rgba(0,255,136,0.35)' : 'rgba(255,255,255,0.12)',
                      color: settings.aiStrictness === level ? '#00ff88' : 'rgba(255,255,255,0.85)',
                    }}
                  >
                    {level === 1 ? t('settings.strictness.gentle') : level === 2 ? t('settings.strictness.strict') : t('settings.strictness.military')}
                  </GhostButton>
                ))}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 4px',
                }}
              >
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>{t('settings.exercise_guide')}</div>
                <input
                  type="checkbox"
                  checked={settings.exerciseGuidanceEnabled}
                  onChange={(e) => updateSettings({ exerciseGuidanceEnabled: e.target.checked })}
                  style={{ transform: 'scale(1.1)' }}
                />
              </div>
              <div style={{ display: 'grid', gap: 10, marginTop: 4 }}>
                <label style={{ display: 'grid', gap: 6 }}>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.72)', fontWeight: 800 }}>{t('settings.base_url')}</div>
                  <input
                    value={aiConfig.baseUrl}
                    onChange={(e) => setAiConfig((prev) => ({ ...prev, baseUrl: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(0,0,0,0.22)', color: 'rgba(255,255,255,0.9)', boxSizing: 'border-box' }}
                  />
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: 10 }}>
                  <label style={{ display: 'grid', gap: 6 }}>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.72)', fontWeight: 800 }}>{t('settings.model')}</div>
                    <input
                      value={aiConfig.model}
                      onChange={(e) => setAiConfig((prev) => ({ ...prev, model: e.target.value }))}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(0,0,0,0.22)', color: 'rgba(255,255,255,0.9)', boxSizing: 'border-box' }}
                    />
                  </label>
                  <label style={{ display: 'grid', gap: 6 }}>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.72)', fontWeight: 800 }}>{t('settings.timeout')}</div>
                    <input
                      type="number"
                      value={aiConfig.timeoutMs}
                      onChange={(e) => setAiConfig((prev) => ({ ...prev, timeoutMs: Number(e.target.value) || 0 }))}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(0,0,0,0.22)', color: 'rgba(255,255,255,0.9)', boxSizing: 'border-box' }}
                    />
                  </label>
                </div>
                <label style={{ display: 'grid', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.72)', fontWeight: 800 }}>{t('settings.api_key')}</div>
                    <div style={{ fontSize: 11, color: aiHasSavedKey ? '#00ff88' : 'rgba(255,255,255,0.45)', fontWeight: 700 }}>
                      {aiHasSavedKey ? t('settings.saved') : t('settings.unsaved')}
                    </div>
                  </div>
                  <input
                    type="password"
                    value={aiApiKeyInput}
                    placeholder={aiHasSavedKey ? t('settings.key_placeholder_saved') : t('settings.key_placeholder_empty')}
                    onChange={(e) => setAiApiKeyInput(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(0,0,0,0.22)', color: 'rgba(255,255,255,0.9)', boxSizing: 'border-box' }}
                  />
                </label>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>{t('settings.key_note')}</div>
                {aiConfigNotice ? (
                  <div style={{ fontSize: 12, color: aiConfigNoticeTone === 'ok' ? '#00ff88' : '#ff8f70', lineHeight: 1.5 }}>{aiConfigNotice}</div>
                ) : null}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <GhostButton onClick={() => void saveAiConfig()}>{t('settings.save')}</GhostButton>
                  <GhostButton onClick={() => void clearSavedAiKey()}>{t('settings.clear_key')}</GhostButton>
                  <GhostButton onClick={() => void testAiConnection()} disabled={aiTesting}>
                    {aiTesting ? t('settings.testing') : t('settings.test_conn')}
                  </GhostButton>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </Modal>

      {achievementModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, ...({ WebkitAppRegion: 'no-drag' } as any) }}>
          <AchievementModal
            open={achievementModalOpen}
            onClose={() => setAchievementModalOpen(false)}
            achievements={achievements}
          />
        </div>
      )}

      {toastQueue.length > 0 && (
        <AchievementUnlockToast
          achievement={toastQueue[0]}
          onClose={() => setToastQueue((prev) => prev.slice(1))}
        />
      )}
    </div>
  );
}

function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

function useWindowSize() {
  const [size, setSize] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));
  useEffect(() => {
    const onResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return size;
}
