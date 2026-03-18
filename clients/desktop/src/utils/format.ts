import i18n from '../i18n';

export function formatHMS(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec
      .toString()
      .padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

export function formatDurationShort(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${i18n.t('common.h_short', { count: h })} ${i18n.t('common.m_short', { count: m })}`;
  if (m > 0) return `${i18n.t('common.m_short', { count: m })} ${i18n.t('common.s_short', { count: sec })}`;
  return i18n.t('common.s_short', { count: sec });
}

export function formatRelativeTime(now: number, then: number | null) {
  if (!then) return '—';
  const diffMs = Math.max(0, now - then);
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return i18n.t('common.just_now');
  if (diffMin < 60) return i18n.t('common.min_ago', { count: diffMin });
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return i18n.t('common.hour_ago', { count: diffH });
  const diffD = Math.floor(diffH / 24);
  return i18n.t('common.day_ago', { count: diffD });
}

