import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { aiChat, aiChatStream } from '../ai/aiService';
import { decideExcuse } from '../ai/excuseService';
import { personalityFromStrictness } from '../ai/aiContext';
import { buildMomentA, buildMomentBDecide, buildMomentBExplain, buildMomentD } from '../ai/prompts';
import { useAppStore } from '../store/useAppStore';
import { formatHMS } from '../utils/format';
import { selectExercises } from '../utils/exerciseSelector';

type Phase = 'prompt' | 'excuse' | 'standing';

interface ExerciseAction {
  name: string;
  duration: number;
  instruction: string;
}

function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'primary' | 'ghost' | 'success' }) {
  const { tone = 'ghost', style, ...rest } = props;
  const base: React.CSSProperties = {
    padding: '13px 18px',
    fontSize: 14,
    fontWeight: 900,
    borderRadius: 999,
    cursor: 'pointer',
    transition: 'transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease',
  };
  const primary: React.CSSProperties = {
    border: '1px solid rgba(255,110,84,0.34)',
    background: 'linear-gradient(180deg, rgba(255,122,94,0.98), rgba(255,94,67,0.98))',
    color: '#1b0906',
    boxShadow: '0 16px 42px rgba(255,94,67,0.22)',
  };
  const ghost: React.CSSProperties = {
    border: '1px solid rgba(255,255,255,0.14)',
    background: 'transparent',
    color: 'rgba(255,255,255,0.9)',
    boxShadow: 'none',
  };
  const success: React.CSSProperties = {
    border: '1px solid rgba(0,255,136,0.36)',
    background: 'linear-gradient(180deg, rgba(0,255,163,0.96), rgba(0,214,133,0.96))',
    color: '#04130c',
    boxShadow: '0 16px 42px rgba(0,255,136,0.18)',
  };

  return <button {...rest} style={{ ...base, ...(tone === 'primary' ? primary : tone === 'success' ? success : ghost), ...style }} />;
}

export default function PopupPage() {
  const { t, i18n } = useTranslation();
  const now = useNow(250);
  const settings = useAppStore((s) => s.settings);
  const standMinutes = Math.max(1, Math.round(settings.standSeconds / 60));
  const day = useAppStore((s) => s.day);
  const dayHistory = useAppStore((s) => s.dayHistory);
  const logs = useAppStore((s) => s.logs);
  const sitStartAt = useAppStore((s) => s.sitStartAt);
  const mode = useAppStore((s) => s.mode);
  const todayStandCount = day.standCount + day.standWorkCount;

  const startStanding = useAppStore((s) => s.startStanding);
  const startStandingWork = useAppStore((s) => s.startStandingWork);
  const finishStanding = useAppStore((s) => s.finishStanding);
  const cancelStanding = useAppStore((s) => s.cancelStanding);
  const ignoreReminder = useAppStore((s) => s.ignoreReminder);
  const pauseForMinutes = useAppStore((s) => s.pauseForMinutes);
  const setAiLastNudge = useAppStore((s) => s.setAiLastNudge);

  useEffect(() => {
    const lang = settings.language;
    if (i18n && typeof i18n.changeLanguage === 'function') {
      i18n.changeLanguage(lang);
    }
  }, [settings.language, i18n]);

  const [phase, setPhase] = useState<Phase>('prompt');
  const [excuseText, setExcuseText] = useState('');
  const [reply, setReply] = useState<string | null>(null);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const nudgeAbortRef = useRef<AbortController | null>(null);
  const excuseAbortRef = useRef<AbortController | null>(null);
  const [excuseExplain, setExcuseExplain] = useState<string>('');
  const [excuseLoading, setExcuseLoading] = useState(false);
  const [pauseSuggestMinutes, setPauseSuggestMinutes] = useState<number | null>(null);
  const [pauseSuggestReply, setPauseSuggestReply] = useState<string | null>(null);
  const [pauseMinutesInput, setPauseMinutesInput] = useState<string>('');

  const [standEndsAt, setStandEndsAt] = useState<number | null>(null);
  const standLeftSec = standEndsAt ? Math.max(0, Math.ceil((standEndsAt - now) / 1000)) : 0;
  const [standCompleted, setStandCompleted] = useState(false);
  const [preStandCountdown, setPreStandCountdown] = useState<number | null>(null);
  const standProgress = standEndsAt ? Math.min(1, Math.max(0, 1 - standLeftSec / Math.max(1, settings.standSeconds))) : 0;

  const [exercises, setExercises] = useState<ExerciseAction[]>([]);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [exerciseTimeLeft, setExerciseTimeLeft] = useState(0);
  const [exerciseLoading, setExerciseLoading] = useState(false);
  const exerciseRequestStartedRef = useRef(false);

  const popupTitle = standCompleted ? t('popup.completed_title') : phase === 'standing' ? t('popup.keep_standing') : t('popup.title');
  const popupEyebrow = standCompleted ? t('popup.completed_intervention_title') : t('popup.intervention_title');
  const popupTitleColor = standCompleted ? '#00ff88' : phase === 'standing' ? '#f3f6fb' : '#ff8f70';
  const popupShellBackground = standCompleted
    ? 'linear-gradient(180deg, rgba(10,40,28,0.96), rgba(7,18,14,0.94))'
    : 'linear-gradient(180deg, rgba(18,22,30,0.96), rgba(10,12,18,0.94))';
  const popupShellBorder = standCompleted ? '1px solid rgba(0,255,136,0.18)' : '1px solid rgba(255,255,255,0.08)';
  const popupShellShadow = standCompleted
    ? '0 36px 100px rgba(0,0,0,0.68), 0 0 0 1px rgba(0,255,136,0.04)'
    : '0 36px 100px rgba(0,0,0,0.64)';
  const focusGlow = standCompleted
    ? 'radial-gradient(circle at 50% 20%, rgba(0,255,136,0.14), rgba(0,0,0,0) 42%)'
    : phase === 'standing'
      ? 'radial-gradient(circle at 50% 18%, rgba(90,196,255,0.12), rgba(0,0,0,0) 44%)'
      : 'radial-gradient(circle at 50% 16%, rgba(255,120,92,0.14), rgba(0,0,0,0) 42%)';

  const startStandSession = () => {
    const startedAt = Date.now();
    if (window.electronAPI?.send) {
      window.electronAPI.send('checkin:stand_start', { at: startedAt });
    } else {
      startStanding(startedAt);
    }
    setStandEndsAt(startedAt + settings.standSeconds * 1000);
  };

  const rageLevel = Math.min(3, 1 + Math.floor((day.excuseCount + day.ignoreCount) / 2));
  const satMinutes = useMemo(() => {
    if (mode !== 'sitting' || !sitStartAt) return 0;
    return Math.floor((now - sitStartAt) / 60000);
  }, [mode, now, sitStartAt]);

  const aiExtra = useMemo(() => {
    const pad2 = (n: number) => n.toString().padStart(2, '0');
    const dayKeyFromTs = (ts: number) => {
      const d = new Date(ts);
      return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    };
    const pauseToday = (logs ?? [])
      .filter((x) => x.type === 'pause' && dayKeyFromTs(x.at) === day.dayKey)
      .map((x) => Number((x.payload as any)?.minutes))
      .filter((n) => Number.isFinite(n) && n > 0)
      .reduce((a, b) => a + b, 0);
    const todayRow = `${day.dayKey} sit=${Math.round(day.totalSitMs / 60000)}m stand=${todayStandCount} standWork=${
      day.standWorkCount
    } standWorkMin=${Math.round(day.totalStandWorkMs / 60000)} ignore=${day.ignoreCount} excuse=${day.excuseCount} pause=${Math.round(
      pauseToday,
    )}m`;
    const rows = [
      todayRow,
      ...(dayHistory ?? [])
        .slice(0, 6)
        .map(
          (h) =>
            `${h.dayKey} sit=${Math.round(h.totalSitMs / 60000)}m stand=${h.standCount + h.standWorkCount} standWork=${
              h.standWorkCount
            } standWorkMin=${Math.round(h.totalStandWorkMs / 60000)} ignore=${h.ignoreCount} excuse=${h.excuseCount} pause=${Math.round(
              h.pauseMinutes,
            )}m`,
        ),
    ];
    const recentExcuses = (logs ?? [])
      .filter((x) => x.type === 'excuse')
      .map((x) => (x.payload as any)?.excuse)
      .filter((s) => typeof s === 'string' && s.trim())
      .slice(0, 5);
    const parts = [t('popup.ai_summary_title'), ...rows];
    if (recentExcuses.length) {
      parts.push('', t('popup.ai_recent_excuses_title'), ...recentExcuses.map((s, i) => `${i + 1}. ${s}`));
    }
    return parts.join('\n');
  }, [day.dayKey, day.excuseCount, day.ignoreCount, day.standWorkCount, day.standCount, day.totalSitMs, day.totalStandWorkMs, dayHistory, logs, t, todayStandCount]);

  useEffect(() => {
    if (phase !== 'standing') return;
    if (!standEndsAt) return;
    if (standLeftSec > 0) return;

    setStandCompleted(true);
  }, [phase, standEndsAt, standLeftSec]);
  
  useEffect(() => {
    if (preStandCountdown === null || preStandCountdown <= 0) return;
    const timer = setTimeout(() => {
      setPreStandCountdown(preStandCountdown - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [preStandCountdown]);
  
  useEffect(() => {
    if (preStandCountdown === 0) {
      setPreStandCountdown(null);
      startStandSession();
    }
  }, [preStandCountdown, settings.standSeconds]);

  const fallbackMessage = useMemo(() => {
    if (rageLevel === 1) return t('ai.popup_fallback_1', { minutes: satMinutes });
    if (rageLevel === 2) return t('ai.popup_fallback_2', { minutes: satMinutes });
    return t('ai.popup_fallback_3', { minutes: satMinutes });
  }, [rageLevel, satMinutes, t]);
  const primaryMessage = aiMessage ?? fallbackMessage;

  useEffect(() => {
    if (!settings.aiEnabled) {
      setAiMessage(null);
      setAiLoading(false);
      return;
    }
    if (phase === 'standing') return;
    nudgeAbortRef.current?.abort();
    const aborter = new AbortController();
    nudgeAbortRef.current = aborter;
    setAiLoading(true);
    setAiMessage('');
    const baseNow = Date.now();
    const messages = buildMomentA(
      {
        now: baseNow,
        appName: 'GetUpAI',
        mission: t('ai.mission'),
        personality: personalityFromStrictness(settings.aiStrictness),
        locale: i18n.language,
      },
      {
        mode,
        sitMinutes: satMinutes,
        standCount: todayStandCount,
        standWorkCount: day.standWorkCount,
        standMinutes: Math.round(day.totalStandMs / 60000),
        longestSitMinutes: Math.round(day.longestSitMs / 60000),
        ignoreCount: day.ignoreCount,
        excuseCount: day.excuseCount,
        standWorkMinutes: Math.round(day.totalStandWorkMs / 60000),
        extra: aiExtra,
      },
    );
    (async () => {
      try {
        const full = await aiChatStream(messages, (t) => setAiMessage(t), aborter.signal);
        if (aborter.signal.aborted) return;
        const text = (full ?? '').trim();
        setAiMessage(text || null);
        if (text) setAiLastNudge(baseNow, text.slice(0, 400));
      } catch (error) {
        if (aborter.signal.aborted) return;
        const reason = error instanceof Error ? error.message : 'Unknown error';
        setAiMessage(`AI generation failed: ${reason}`);
      } finally {
        if (!aborter.signal.aborted) setAiLoading(false);
      }
    })();
    return () => aborter.abort();
  }, [
    aiExtra,
    day.excuseCount,
    day.ignoreCount,
    day.longestSitMs,
    day.standCount,
    day.standWorkCount,
    day.totalStandMs,
    day.totalStandWorkMs,
    mode,
    phase,
    satMinutes,
    setAiLastNudge,
    settings.aiEnabled,
    settings.aiStrictness,
    todayStandCount,
  ]);

  useEffect(() => {
    if (phase !== 'standing') {
      exerciseRequestStartedRef.current = false;
      setExercises([]);
      setCurrentExerciseIndex(0);
      setExerciseTimeLeft(0);
      setExerciseLoading(false);
      return;
    }

    if (!settings.exerciseGuidanceEnabled) {
      exerciseRequestStartedRef.current = false;
      setExercises([]);
      setCurrentExerciseIndex(0);
      setExerciseTimeLeft(0);
      setExerciseLoading(false);
      return;
    }

    if (exerciseRequestStartedRef.current) return;
    exerciseRequestStartedRef.current = true;

    const standSeconds = settings.standSeconds;
    const locale = settings.language === 'zh' ? 'zh' : 'en';
    let cancelled = false;

    if (!settings.aiEnabled) {
      const defaultExercises = selectExercises(standSeconds, locale);
      if (!cancelled) {
        setExercises(defaultExercises);
        setCurrentExerciseIndex(0);
        setExerciseTimeLeft(defaultExercises[0]?.duration ?? 0);
        setExerciseLoading(false);
      }
      return;
    }

    setExerciseLoading(true);
    const base = {
      now: Date.now(),
      appName: 'GetUpAI',
      mission: t('ai.mission'),
      personality: personalityFromStrictness(settings.aiStrictness),
      locale: i18n.language,
    };
    
    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : hour < 22 ? 'evening' : 'night';

    const timeoutId = setTimeout(() => {
      if (cancelled) return;
      const defaultExercises = selectExercises(settings.standSeconds, settings.language === 'zh' ? 'zh' : 'en');
      setExercises(defaultExercises);
      setCurrentExerciseIndex(0);
      setExerciseTimeLeft(defaultExercises[0]?.duration ?? 0);
      setExerciseLoading(false);
    }, 10000);

    (async () => {
      try {

        const messages = buildMomentD(base, {
          sitMinutes: satMinutes,
          standMinutes,
          timeOfDay,
          standCountToday: todayStandCount,
          ignoreCountToday: day.ignoreCount,
        });
        console.log('AI Exercise Request - messages:', JSON.stringify(messages).substring(0, 200));
        const content = await aiChat(messages);
        if (cancelled) return;
        console.log('AI Exercise Response:', content);
        clearTimeout(timeoutId);
        console.log('AI Exercise Raw Content:', content);
        
        let data: ExerciseAction[] = [];
        try {
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          const jsonStr = jsonMatch ? jsonMatch[0] : content;
          const parsed = JSON.parse(jsonStr);
          if (Array.isArray(parsed)) {
            data = parsed.filter((e): e is ExerciseAction => 
              typeof e === 'object' && 
              e !== null && 
              typeof e.name === 'string' && 
              typeof e.duration === 'number' &&
              typeof e.instruction === 'string'
            );
          }
        } catch (parseErr) {
          console.error('Failed to parse exercises JSON:', parseErr, 'Content was:', content.substring(0, 500));
        }
        
        const totalDuration = data.reduce((sum, e) => sum + (e.duration || 0), 0);
        const maxDuration = settings.standSeconds * 1.2;
        
        if (data.length > 0 && totalDuration <= maxDuration) {
          if (cancelled) return;
          setExercises(data);
          setCurrentExerciseIndex(0);
          setExerciseTimeLeft(data[0].duration);
        } else {
          if (cancelled) return;
          console.warn('AI exercises too long:', totalDuration, 'vs standSeconds', settings.standSeconds, '- using default');
          const defaultExercises = selectExercises(settings.standSeconds, settings.language === 'zh' ? 'zh' : 'en');
          setExercises(defaultExercises);
          setCurrentExerciseIndex(0);
          setExerciseTimeLeft(defaultExercises[0]?.duration ?? 0);
        }
      } catch (e) {
        if (cancelled) return;
        console.error('AI exercise request failed:', e);
        const defaultExercises = selectExercises(settings.standSeconds, settings.language === 'zh' ? 'zh' : 'en');
        setExercises(defaultExercises);
        setCurrentExerciseIndex(0);
        setExerciseTimeLeft(defaultExercises[0]?.duration ?? 0);
      } finally {
        clearTimeout(timeoutId);
        if (!cancelled) setExerciseLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [phase, settings.aiEnabled, settings.exerciseGuidanceEnabled, settings.aiStrictness, settings.standSeconds, settings.language, satMinutes, standMinutes, todayStandCount, day.ignoreCount]);

  useEffect(() => {
    if (phase !== 'standing' || exercises.length === 0) return;

    if (exerciseTimeLeft <= 0) {
      if (currentExerciseIndex < exercises.length - 1) {
        const nextIndex = currentExerciseIndex + 1;
        setCurrentExerciseIndex(nextIndex);
        setExerciseTimeLeft(exercises[nextIndex].duration);
      }
      return;
    }

    const t = setInterval(() => {
      setExerciseTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(t);
  }, [phase, exercises, currentExerciseIndex, exerciseTimeLeft]);

  const onStand = () => {
    if (settings.exerciseGuidanceEnabled && (settings.aiEnabled || true)) {
      setPhase('standing');
      setPreStandCountdown(3);
    } else {
      setPhase('standing');
      startStandSession();
    }
  };
  
  const confirmStand = () => {
    setPreStandCountdown(null);
    startStandSession();
  };
  
  const cancelPreStand = () => {
    setPreStandCountdown(null);
    setPhase('prompt');
  };

  const onSubmitExcuse = async () => {
    const trimmed = excuseText.trim();
    if (!trimmed) return;
    const at = Date.now();
    if (!settings.aiEnabled) {
      const replyText = t('ai.not_enabled');
      setReply(replyText);
      return;
    }
    excuseAbortRef.current?.abort();
    const aborter = new AbortController();
    excuseAbortRef.current = aborter;
    setExcuseLoading(true);
    setExcuseExplain('');
    setPauseSuggestMinutes(null);
    setPauseSuggestReply(null);
    setPauseMinutesInput('');
    setReply(null);
    const baseNow = Date.now();
    const base = {
      now: baseNow,
      appName: 'GetUpAI',
      mission: t('ai.mission'),
      personality: personalityFromStrictness(settings.aiStrictness),
      locale: i18n.language,
    } as const;
    const ctx = {
      mode,
      sitMinutes: satMinutes,
      standCount: todayStandCount,
      standWorkCount: day.standWorkCount,
      standMinutes: Math.round(day.totalStandMs / 60000),
      longestSitMinutes: Math.round(day.longestSitMs / 60000),
      ignoreCount: day.ignoreCount,
      excuseCount: day.excuseCount,
      standWorkMinutes: Math.round(day.totalStandWorkMs / 60000),
      extra: aiExtra,
    } as const;
    try {
      await aiChatStream(buildMomentBExplain(base, ctx, trimmed), (t) => setExcuseExplain(t), aborter.signal);
      if (aborter.signal.aborted) return;
      const decided = await decideExcuse(buildMomentBDecide(base, ctx, trimmed));
      if (aborter.signal.aborted) return;
      const minutesRaw = typeof decided?.minutes === 'number' ? decided.minutes : Number(decided?.minutes);
      const minutes = Number.isFinite(minutesRaw) ? Math.max(0, Math.floor(minutesRaw)) : null;
      const replyText = typeof decided?.reply === 'string' ? decided.reply.trim() : '';
      setPauseSuggestMinutes(minutes);
      setPauseSuggestReply(replyText || null);
      setPauseMinutesInput(minutes !== null ? String(minutes) : '');
      setReply(replyText || null);
      if (window.electronAPI?.send) {
        window.electronAPI.send('checkin:excuse', {
          at,
          excuse: trimmed,
          reply: replyText || '',
          pauseMinutes: minutes,
        });
      }
    } catch {
      const replyText = buildExcuseReply(trimmed, rageLevel, t);
      setReply(replyText);
      setPauseSuggestMinutes(null);
      setPauseSuggestReply(null);
    } finally {
      if (!aborter.signal.aborted) setExcuseLoading(false);
    }
  };

  const onApplyPause = () => {
    const at = Date.now();
    const n = Number(pauseMinutesInput);
    if (!Number.isFinite(n)) return;
    const minutes = Math.max(0, Math.floor(n));
    if (window.electronAPI?.send) {
      window.electronAPI.send('checkin:pause', { at, minutes });
      return;
    }
    pauseForMinutes(at, minutes);
  };

  return (
    <div
      style={{
        height: '100vh',
        background: 'linear-gradient(180deg, #090b10, #05060a)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        color: 'white',
        padding: 24,
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: 'min(700px, 92vw)',
          borderRadius: 22,
          border: popupShellBorder,
          boxShadow: popupShellShadow,
          background: `${focusGlow}, ${popupShellBackground}`,
          padding: 30,
          textAlign: 'center',
        }}
        data-testid="popup-focus-shell"
      >
        <div style={{ fontSize: 11, letterSpacing: 2.4, color: 'rgba(255,255,255,0.48)', marginBottom: 12, textTransform: 'uppercase' }}>
          {popupEyebrow}
        </div>
        <div style={{ fontSize: 30, fontWeight: 950, letterSpacing: 0.8, color: popupTitleColor, marginBottom: 8 }} data-testid="popup-title">
          {popupTitle}
        </div>

        {preStandCountdown !== null && exercises.length > 0 ? (
          <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.64)', marginBottom: 16 }}>
              {t('popup.get_ready')}
            </div>
            <div style={{ fontSize: 72, fontWeight: 900, color: '#00ff88', marginBottom: 18, fontVariantNumeric: 'tabular-nums' }}>
              {preStandCountdown}
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 8 }}>
              {exercises[0]?.name}
            </div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.66)', marginBottom: 18, maxWidth: 420, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
              {exercises[0]?.instruction}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
              {t('popup.exercise_summary', { count: exercises.length, minutes: Math.ceil(exercises.reduce((s, e) => s + e.duration, 0) / 60) })}
            </div>
            <div style={{ marginTop: 22, display: 'flex', gap: 12, justifyContent: 'center' }}>
              <Button tone="ghost" onClick={cancelPreStand}>
                {t('actions.back')}
              </Button>
              <Button tone="primary" onClick={confirmStand}>
                {t('actions.start_now')}
              </Button>
            </div>
          </div>
        ) : standCompleted ? (
          <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
            <div style={{ fontSize: 46, marginBottom: 14 }}>✅</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#00ff88', marginBottom: 10 }}>
              {t('popup.completed_subtitle')}
            </div>
            <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.76)', marginBottom: 10 }}>
              {t('popup.exercises_completed', { count: exercises.length })}
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                borderRadius: 999,
                background: 'rgba(0,255,136,0.10)',
                border: '1px solid rgba(0,255,136,0.24)',
                marginBottom: 22,
                color: 'rgba(255,255,255,0.82)',
              }}
            >
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.68)' }}>{t('popup.today_total_stands')}</span>
              <span style={{ fontSize: 18, fontWeight: 900, color: '#00ff88' }}>{t('common.times', { count: todayStandCount + 1 })}</span>
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <Button 
                tone="success" 
                onClick={() => {
                  const payload = { at: Date.now(), standDurationMs: settings.standSeconds * 1000 };
                  if (window.electronAPI?.send) {
                    window.electronAPI.send('checkin:stood', payload);
                  } else {
                    finishStanding(Date.now());
                  }
                  if (window.electronAPI?.closePopup) window.electronAPI.closePopup();
                }}
              >
                {t('actions.continue')}
              </Button>
            </div>
          </div>
        ) : phase === 'standing' ? (
          <>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.62)', letterSpacing: 0.4, marginBottom: 8 }} data-testid="popup-title-standing">
              {t('popup.keep_standing')}
            </div>
            <div
              data-testid="popup-stand-ring"
              style={{
                width: 240,
                height: 240,
                margin: '8px auto 0',
                borderRadius: '50%',
                padding: 16,
                background: `conic-gradient(#5ac4ff ${standProgress * 360}deg, rgba(255,255,255,0.08) 0deg)`,
                boxShadow: '0 24px 60px rgba(0,0,0,0.28)',
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle at 50% 38%, rgba(90,196,255,0.14), rgba(10,12,18,0.98) 58%)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div style={{ fontSize: 68, fontWeight: 900, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                  {formatHMS(standLeftSec)}
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.52)', marginTop: 12 }}>
                  {t('popup.keep_standing')}
                </div>
              </div>
            </div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.58)', marginTop: 10 }}>
              {t('popup.exercise_summary', { count: exercises.length || 1, minutes: Math.max(1, Math.ceil(settings.standSeconds / 60)) })}
            </div>
            {exercises.length > 0 && (
              <div
                style={{
                  marginTop: 18,
                  padding: 16,
                  borderRadius: 18,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(12px)',
                  textAlign: 'left',
                  animation: 'fadeIn 0.5s ease-out',
                  maxWidth: 480,
                  marginLeft: 'auto',
                  marginRight: 'auto',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
                    {t('popup.exercise_step', { current: currentExerciseIndex + 1, total: exercises.length })}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#00ff88', fontVariantNumeric: 'tabular-nums' }}>
                    {formatHMS(exerciseTimeLeft)}
                  </div>
                </div>
                <div style={{ 
                  width: '100%', 
                  height: 6, 
                  background: 'rgba(255,255,255,0.15)', 
                  borderRadius: 3, 
                  overflow: 'hidden',
                  marginBottom: 12 
                }}>
                  <div style={{ 
                    width: `${exercises[currentExerciseIndex].duration > 0 ? (exerciseTimeLeft / exercises[currentExerciseIndex].duration) * 100 : 0}%`, 
                    height: '100%', 
                    background: 'linear-gradient(90deg, #00ff88, #00cc6a)', 
                    borderRadius: 3,
                    transition: 'width 1s linear'
                  }} />
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 24 }}>🧘</span>
                  {exercises[currentExerciseIndex].name}
                </div>
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 1.5 }}>
                  {exercises[currentExerciseIndex].instruction}
                </div>
                {currentExerciseIndex < exercises.length - 1 && (
                  <div style={{ 
                    marginTop: 12, 
                    paddingTop: 12, 
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.5)'
                  }}>
                    <span style={{ marginRight: 4 }}>👆</span>
                    {t('popup.next_exercise', { name: exercises[currentExerciseIndex + 1]?.name })}
                  </div>
                )}
              </div>
            )}
            {exerciseLoading && (
              <div style={{ marginTop: 20, fontSize: 14, color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }}>
                {t('popup.exercise_generating')}
              </div>
            )}
            <div style={{ marginTop: 18, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                data-testid="btn-switch-work"
                tone="primary"
                onClick={() => {
                  setStandEndsAt(null);
                  const at = Date.now();
                  if (window.electronAPI?.send) {
                    window.electronAPI.send('checkin:stand_work_start', { at });
                  } else {
                    startStandingWork(at);
                  }
                  if (window.electronAPI?.closePopup) window.electronAPI.closePopup();
                }}
              >
                {t('actions.stand_work_switch')}
              </Button>
              <Button
                data-testid="btn-sit-back"
                tone="ghost"
                onClick={() => {
                  if (window.electronAPI?.closePopup) {
                    window.electronAPI.closePopup();
                    return;
                  }
                  cancelStanding(Date.now());
                  setPhase('prompt');
                  setStandEndsAt(null);
                }}
              >
                {t('actions.sit_back')}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div
              data-testid="popup-primary-message"
              style={{
                fontSize: 18,
                lineHeight: 1.65,
                color: 'rgba(255,255,255,0.88)',
                marginBottom: 10,
                maxWidth: 480,
                marginLeft: 'auto',
                marginRight: 'auto',
                whiteSpace: 'pre-wrap',
              }}
            >
              {primaryMessage}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.56)', marginBottom: 20 }}>
              {t('popup.exercise_summary', { count: 1, minutes: standMinutes })}
            </div>

            {phase === 'excuse' ? (
              <>
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.70)', marginBottom: 10 }}>
                  {t('popup.excuse_prompt')}
                </div>
                <textarea
                  value={excuseText}
                  onChange={(e) => setExcuseText(e.target.value)}
                  placeholder={t('popup.excuse_placeholder')}
                  style={{
                    width: 'min(560px, 100%)',
                    height: 96,
                    resize: 'none',
                    borderRadius: 14,
                    border: '1px solid rgba(255,255,255,0.14)',
                    background: 'rgba(0,0,0,0.28)',
                    color: 'rgba(255,255,255,0.92)',
                    padding: 12,
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
                {excuseLoading || excuseExplain ? (
                  <div
                    style={{
                      marginTop: 12,
                      maxWidth: 560,
                      marginLeft: 'auto',
                      marginRight: 'auto',
                      padding: 14,
                      borderRadius: 12,
                      border: '1px solid rgba(255,255,255,0.10)',
                      background: 'rgba(0,0,0,0.22)',
                      color: 'rgba(255,255,255,0.90)',
                      textAlign: 'left',
                      lineHeight: 1.6,
                      whiteSpace: 'pre-wrap',
                      minHeight: 52,
                    }}
                  >
                    {excuseExplain.trim() ? excuseExplain.trim() : t('popup.judging')}
                  </div>
                ) : null}
                {reply ? (
                  <div
                    style={{
                      marginTop: 16,
                      maxWidth: 560,
                      marginLeft: 'auto',
                      marginRight: 'auto',
                      padding: 14,
                      borderRadius: 12,
                      border: '1px solid rgba(255,68,68,0.28)',
                      background: 'rgba(255,68,68,0.08)',
                      color: 'rgba(255,255,255,0.92)',
                      textAlign: 'left',
                      lineHeight: 1.6,
                    }}
                  >
                    {reply}
                  </div>
                ) : null}
                {pauseSuggestMinutes !== null ? (
                  <>
                    <div style={{ marginTop: 12, fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>{t('popup.custom_pause_duration')}</div>
                    <div style={{ marginTop: 8, display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center' }}>
                      <input
                        value={pauseMinutesInput}
                        onChange={(e) => setPauseMinutesInput(e.target.value)}
                        inputMode="numeric"
                        style={{
                          width: 120,
                          padding: '10px 12px',
                          borderRadius: 12,
                          border: '1px solid rgba(255,255,255,0.14)',
                          background: 'rgba(0,0,0,0.22)',
                          color: 'rgba(255,255,255,0.92)',
                          boxSizing: 'border-box',
                          outline: 'none',
                          textAlign: 'center',
                        }}
                      />
                      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>{t('popup.minutes')}</div>
                      <Button
                        tone="primary"
                        onClick={onApplyPause}
                        disabled={!pauseMinutesInput.trim() || !Number.isFinite(Number(pauseMinutesInput)) || Number(pauseMinutesInput) <= 0}
                        style={{ padding: '12px 14px' }}
                      >
                        {t('actions.execute_pause')}
                      </Button>
                    </div>
                    <div style={{ marginTop: 12, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                      {[5, 10, 15, 30, 60].map((minutes) => (
                        <Button
                          key={minutes}
                          tone="ghost"
                          onClick={() => {
                            setPauseMinutesInput(String(minutes));
                            onApplyPause();
                          }}
                        >
                          {t('popup.pause_x_minutes', { count: minutes })}
                        </Button>
                      ))}
                    </div>
                  </>
                ) : pauseSuggestReply !== null ? (
                  <div style={{ marginTop: 12, fontSize: 12, color: 'rgba(255,204,0,0.75)' }}>{t('popup.ai_no_suggestion')}</div>
                ) : null}
              </>
            ) : (
              <div style={{ marginTop: 10, display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Button tone="primary" onClick={onStand} data-testid="btn-admit-mistake" style={{ minWidth: 180 }}>
                  {t('actions.admit_mistake', { minutes: standMinutes })}
                </Button>
                <Button
                  data-testid="btn-give-reason"
                  tone="ghost"
                  onClick={() => {
                    setPhase('excuse');
                    setReply(null);
                    setExcuseExplain('');
                    setExcuseLoading(false);
                    setPauseSuggestMinutes(null);
                    setPauseSuggestReply(null);
                    setPauseMinutesInput('');
                  }}
                >
                  {t('actions.give_reason')}
                </Button>
                <Button
                  data-testid="btn-remind-later"
                  tone="ghost"
                  onClick={() => {
                    const at = Date.now();
                    if (window.electronAPI?.send) {
                      window.electronAPI.send('checkin:ignore', { at });
                    } else {
                      ignoreReminder(at);
                    }
                    if (window.electronAPI?.closePopup) window.electronAPI.closePopup();
                  }}
                >
                  {t('actions.remind_later')}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
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

function buildExcuseReply(excuse: string, rageLevel: number, t: (key: string, opts?: any) => string) {
  const templates = [
    t('excuse_reply.template_1', { excuse }),
    t('excuse_reply.template_2', { excuse }),
    t('excuse_reply.template_3', { excuse }),
  ];
  const extra = rageLevel === 1 ? t('excuse_reply.extra_1') : rageLevel === 2 ? t('excuse_reply.extra_2') : t('excuse_reply.extra_3');
  return `${templates[rageLevel - 1] ?? templates[0]} ${extra}`;
}
