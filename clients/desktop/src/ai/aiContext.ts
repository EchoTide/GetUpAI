export type AiPersonality = 'gentle' | 'strict' | 'drill';

export interface AiBaseContext {
  now: number;
  appName: string;
  mission: string;
  personality: AiPersonality;
  locale?: string;
}

export interface AiUserContext {
  mode: string;
  sitMinutes: number;
  standCount: number;
  standMinutes?: number;
  ignoreCount: number;
  excuseCount: number;
  pauseMinutes?: number;
  longestSitMinutes?: number;
  standWorkCount?: number;
  standWorkMinutes: number;
  healthPct?: number;
  extra?: string;
}

function pad2(n: number) {
  return n.toString().padStart(2, '0');
}

export function formatNowWithSeconds(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

export function personalityFromStrictness(strictness: 1 | 2 | 3): AiPersonality {
  return strictness === 1 ? 'gentle' : strictness === 2 ? 'strict' : 'drill';
}

export function buildBackgroundBlock(base: AiBaseContext) {
  const isEn = base.locale === 'en';
  const nowText = formatNowWithSeconds(base.now);
  
  let personaText = '';
  if (base.personality === 'gentle') {
    personaText = isEn ? 'Gentle but Firm' : '温和但坚定';
  } else if (base.personality === 'strict') {
    personaText = isEn ? 'Strict but Effective' : '严厉但有效';
  } else {
    personaText = isEn ? 'Drill Sergeant' : '军训教官式';
  }

  return [
    `${isEn ? 'App' : '应用'}：${base.appName}`,
    `${isEn ? 'Mission' : '使命'}：${base.mission}`,
    `${isEn ? 'Personality' : '性格'}：${personaText}`,
    `${isEn ? 'Current Time' : '当前时间'}：${nowText}`,
  ].join('\n');
}

export function buildUserContextBlock(ctx: AiUserContext, locale?: string) {
  const isEn = locale === 'en';
  const lines = [
    `${isEn ? 'Mode' : '模式'}：${ctx.mode}`,
    `${isEn ? 'Sitting' : '久坐'}：${ctx.sitMinutes} ${isEn ? 'mins' : '分钟'}`,
    ...(typeof ctx.longestSitMinutes === 'number' 
      ? [`${isEn ? 'Max Sit Duration' : '最长连续久坐'}：${ctx.longestSitMinutes} ${isEn ? 'mins' : '分钟'}`] 
      : []),
    `${isEn ? 'Stands Today' : '今日起立'}：${ctx.standCount} ${isEn ? 'times' : '次'}`,
    ...(typeof ctx.standMinutes === 'number' 
      ? [`${isEn ? 'Total Stand Time' : '站立总时长'}：${ctx.standMinutes} ${isEn ? 'mins' : '分钟'}`] 
      : []),
    typeof ctx.standWorkCount === 'number'
      ? `${isEn ? 'Stand Work' : '站立办公'}：${ctx.standWorkCount} ${isEn ? 'times' : '次'} · ${ctx.standWorkMinutes} ${isEn ? 'mins' : '分钟'}`
      : `${isEn ? 'Stand Work' : '站立办公'}：${ctx.standWorkMinutes} ${isEn ? 'mins' : '分钟'}`,
    `${isEn ? 'Excuses Today' : '今日借口'}：${ctx.excuseCount} ${isEn ? 'times' : '次'}`,
    `${isEn ? 'Ignored Today' : '今日忽略'}：${ctx.ignoreCount} ${isEn ? 'times' : '次'}`,
    ...(typeof ctx.pauseMinutes === 'number' 
      ? [`${isEn ? 'Paused Today' : '今日暂停'}：${ctx.pauseMinutes} ${isEn ? 'mins' : '分钟'}`] 
      : []),
  ];
  if (typeof ctx.healthPct === 'number') lines.push(`${isEn ? 'Spine Health' : '脊椎健康度'}：${ctx.healthPct}%`);
  if (typeof ctx.extra === 'string' && ctx.extra.trim()) {
    lines.push('');
    lines.push(isEn ? 'Extra Info:' : '补充信息：');
    lines.push(ctx.extra.trim());
  }
  return lines.join('\n');
}
