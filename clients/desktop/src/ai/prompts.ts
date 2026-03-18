import { buildBackgroundBlock, buildUserContextBlock, type AiBaseContext, type AiUserContext } from './aiContext';

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export function buildSystemPrompt(base: AiBaseContext) {
  const isEn = base.locale === 'en';
  return [
    buildBackgroundBlock(base),
    '',
    isEn
      ? 'You are a monitoring coach. Your goal is to reduce the user\'s sitting time and get them to stand up on time. Your language style should dynamically adjust based on the user\'s performance: when they do WELL (high stand count, low sedentary time, good health score), be encouraging, praising, and positive; when they do POORLY (low stand count, high sedentary time, many excuses/ignores), be sharp, critical, and direct. Must not violate laws or regulations, must not leak privacy, and must not output long texts.'
      : '你是一个监督教练，目标是让用户少久坐、按时起立。你的语言风格应根据用户今日表现动态调整：如果用户今日表现好（站立次数≥目标、久坐时间短、健康指数高、很少忽略/找理由），应该给予真诚的表扬和鼓励，语气积极正向；如果用户今日表现差（站立次数少、久坐时间长、健康指数低、多次忽略或找理由），语言可以扎心、批评直接。不要违法违规，不要泄露隐私，不要输出长篇。',
  ].join('\n');
}

export function buildMomentA(base: AiBaseContext, ctx: AiUserContext): ChatMessage[] {
  const isEn = base.locale === 'en';
  const sys = buildSystemPrompt(base);
  const user = [
    isEn ? 'Moment A: Dynamic Urge after Countdown.' : '瞬间 A：倒计时归零后的动态催促。',
    isEn
      ? 'Output a short or long urging message. Do not be repetitive, do not use quotes, do not use emojis, do not explain.'
      : '输出一段中文催促，可以短也可以长，但不要流水账，不要加引号，不要加表情，不要解释。',
    '',
    buildUserContextBlock(ctx, base.locale),
  ].join('\n');
  return [
    { role: 'system', content: sys },
    { role: 'user', content: user },
  ];
}

export function buildMomentB(base: AiBaseContext, ctx: AiUserContext, excuse: string): ChatMessage[] {
  const isEn = base.locale === 'en';
  const sys = buildSystemPrompt(base);
  const user = [
    isEn ? 'Moment B: Excuse Review and Game.' : '瞬间 B：理由审核与博弈。',
    isEn ? 'User proposes an excuse to pause monitoring.' : '用户提出理由，希望暂停监督。',
    isEn
      ? 'First, write 1-2 sentences of "Ruling Explanation" (<=60 words, must explain why you give this duration).'
      : '先用 1-2 句中文写“裁决说明”（<=80字，必须解释你为什么给这个时长）。',
    isEn
      ? 'Then output ONLY a JSON: {"minutes":number,"reply":string}.'
      : '然后只输出一个 JSON：{"minutes":number,"reply":string}。',
    isEn
      ? 'minutes can be any number (can be long), reply is the ruling message to the user (<=60 words).'
      : 'minutes 可以是任意分钟数（可以很长），reply 是对用户的裁决话术（<=80字）。',
    isEn ? 'Do not output anything else besides these two parts.' : '不要输出除上述两段以外的任何内容。',
    '',
    isEn ? `Excuse: ${excuse}` : `理由：${excuse}`,
    '',
    buildUserContextBlock(ctx, base.locale),
  ].join('\n');
  return [
    { role: 'system', content: sys },
    { role: 'user', content: user },
  ];
}

export function buildMomentBExplain(base: AiBaseContext, ctx: AiUserContext, excuse: string): ChatMessage[] {
  const isEn = base.locale === 'en';
  const sys = buildSystemPrompt(base);
  const user = [
    isEn ? 'Moment B: Excuse Review and Game.' : '瞬间 B：理由审核与博弈。',
    isEn ? 'User proposes an excuse to pause monitoring.' : '用户提出理由，希望暂停监督。',
    isEn
      ? 'Please output ONLY 1-2 sentences of "Ruling Explanation" (<=60 words), must explain why you give/don\'t give pause, and why this amount.'
      : '请只输出 1-2 句中文“裁决说明”（<=80字），必须解释你为什么会给/不给暂停、以及为什么是这个量级。',
    isEn ? 'Do not output JSON, do not output list, do not output other content.' : '不要输出 JSON，不要输出列表，不要输出其它内容。',
    '',
    isEn ? `Excuse: ${excuse}` : `理由：${excuse}`,
    '',
    buildUserContextBlock(ctx, base.locale),
  ].join('\n');
  return [
    { role: 'system', content: sys },
    { role: 'user', content: user },
  ];
}

export function buildMomentBDecide(base: AiBaseContext, ctx: AiUserContext, excuse: string): ChatMessage[] {
  const isEn = base.locale === 'en';
  const sys = buildSystemPrompt(base);
  const user = [
    isEn ? 'Moment B: Excuse Review and Game.' : '瞬间 B：理由审核与博弈。',
    isEn
      ? 'Please call decide_pause tool, passing minutes(number) and reply(string).'
      : '请调用 decide_pause 工具，传入 minutes(number) 与 reply(string)。',
    isEn
      ? 'minutes can be any number (can be long), reply is the ruling message to the user (<=60 words).'
      : 'minutes 可以是任意分钟数（可以很长），reply 为对用户的裁决话术（<=80字）。',
    isEn ? 'Do not output any text besides tool call.' : '不要输出除工具调用以外的任何文字。',
    '',
    isEn ? `Excuse: ${excuse}` : `理由：${excuse}`,
    '',
    buildUserContextBlock(ctx, base.locale),
  ].join('\n');
  return [
    { role: 'system', content: sys },
    { role: 'user', content: user },
  ];
}

export function buildMomentC(base: AiBaseContext, ctx: AiUserContext, dailyFacts: string): ChatMessage[] {
  const isEn = base.locale === 'en';
  const sys = buildSystemPrompt(base);
  const user = [
    isEn ? 'Moment C: Stand Analysis Report (Coach Comment).' : '瞬间 C：站立分析报告（教练点评）。',
    isEn
      ? 'Please write a shareable "Coach Comment", be emotional, have memes/jokes, cite facts, do not look like a report.'
      : '请写一段可分享的"教练点评"。首先，根据今日数据判断用户表现好坏：表现好=站立次数达到目标、久坐时间短、健康指数≥80%、忽略和理由少；表现差=站立次数未达标、久坐时间长、健康指数＜60%、忽略或理由多。然后根据判断结果选择语气：表现好=真诚表扬、鼓励、认可成就，略带幽默调侃；表现差=扎心批评、指出问题、唤醒危机感，略带自嘲。要求：有情绪、有梗、引用今日数据中的具体事实，不要像报表。',
    isEn
      ? 'Limit: 80-150 words, end with 1 suggestion for tomorrow (separate line, starting with "Tomorrow Suggestion:").'
      : '限制：120-220 字，最后给 1 条明日建议（单独一行，以“明日建议：”开头）。',
    '',
    buildUserContextBlock(ctx, base.locale),
    '',
    isEn ? 'Daily Stats:' : '今日数据：',
    dailyFacts,
  ].join('\n');
  return [
    { role: 'system', content: sys },
    { role: 'user', content: user },
  ];
}

export interface MomentDContext {
  sitMinutes: number;
  standMinutes: number;
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  standCountToday?: number;
  ignoreCountToday?: number;
}

export function buildMomentD(base: AiBaseContext, ctx: MomentDContext): ChatMessage[] {
  const isEn = base.locale === 'en';
  const sys = buildSystemPrompt(base);
  
  const timeGreeting = ctx.timeOfDay
    ? isEn
      ? (ctx.timeOfDay === 'morning' ? 'Good morning' : ctx.timeOfDay === 'afternoon' ? 'Good afternoon' : ctx.timeOfDay === 'evening' ? 'Good evening' : 'Late night')
      : (ctx.timeOfDay === 'morning' ? '早上好' : ctx.timeOfDay === 'afternoon' ? '下午好' : ctx.timeOfDay === 'evening' ? '傍晚好' : '夜深了')
    : '';
  
  const performanceHint = (ctx.standCountToday ?? 0) < 2
    ? isEn
      ? 'Note: User has stood less than 2 times today, consider giving shorter but more energetic exercises.'
      : '提示：用户今天站立次数不足2次，建议做简短有力的动作。'
    : (ctx.standCountToday ?? 0) >= 5
    ? isEn
      ? 'Note: User has already stood many times today, give relaxing stretches.'
      : '提示：用户今天已经站立多次，给予放松拉伸动作。'
    : '';

  const exerciseVariations = [
    isEn ? ['Arm waves', 'Torso twist', 'Shoulder shrugs', 'Walking in place', 'Deep breathing', 'Side bends', 'Calf raises', 'Wall push-ups'] 
          : ['手臂摆动', '躯干扭转', '耸肩运动', '原地踏步', '深呼吸', '侧身弯曲', '踮脚尖', '墙边俯卧撑'],
    isEn ? ['Neck stretches', 'Hip circles', 'Wrist circles', 'Leg swings', 'Standing quadriceps stretch', 'Side leg raises'] 
          : ['颈部拉伸', '髋关节环绕', '手腕环绕', '腿部摆动', '站立大腿前侧拉伸', '侧抬腿'],
    isEn ? ['Light jogging', 'High knees', 'Star jumps', 'Dance moves', 'Shadow boxing'] 
          : ['轻慢跑', '高抬腿', '星星跳', '跳舞动作', '空拳击'],
  ];
  const randomVariations = exerciseVariations[Math.floor(Math.random() * exerciseVariations.length)];
  const variationText = isEn 
    ? `Try these different exercises: ${randomVariations.join(', ')}`
    : `尝试这些不同的动作：${randomVariations.join('、')}`;

  const user = [
    isEn ? 'Moment D: Stand Exercise Guide' : '瞬间 D：站立运动引导',
    timeGreeting,
    isEn
      ? `User has been sitting for ${ctx.sitMinutes} minutes, and needs to stand for ${ctx.standMinutes} minutes now.`
      : `用户已久坐 ${ctx.sitMinutes} 分钟，现在需要站立 ${ctx.standMinutes} 分钟。`,
    performanceHint,
    variationText,
    isEn ? 'Be CREATIVE! Generate DIFFERENT exercises each time. Do NOT repeat the same exercises.' : '发挥创意！每次生成不同的动作。不要重复相同的动作。',
    isEn ? 'Please generate a set of stretch/activity guide tailored to this moment.' : '请生成一组适合当前时刻的拉伸/活动动作引导。',
    isEn
      ? 'Output format: JSON array, each element contains name, duration(seconds), instruction(one sentence).'
      : '输出格式：JSON 数组，每个元素包含 name(动作名)、duration(秒数)、instruction(一句话说明)。',
    isEn 
      ? `IMPORTANT: Total duration of ALL exercises must be between ${Math.round(ctx.standMinutes * 60 * 0.7)} and ${Math.round(ctx.standMinutes * 60 * 0.9)} seconds. For ${ctx.standMinutes} minutes stand time, total should be ${Math.round(ctx.standMinutes * 60 * 0.8)} seconds. Only 2-3 exercises needed.`
      : `重要：所有动作的总时长必须在 ${Math.round(ctx.standMinutes * 60 * 0.7)} 到 ${Math.round(ctx.standMinutes * 60 * 0.9)} 秒之间。站立 ${ctx.standMinutes} 分钟，总时长约 ${Math.round(ctx.standMinutes * 60 * 0.8)} 秒即可。只需 2-3 个动作。`,
    isEn ? 'Focus on: neck, lumbar, shoulders, legs.' : '重点关注：颈椎、腰椎、肩膀、腿部。',
    isEn
      ? 'Example output: [{"name":"Arm Circles","duration":30,"instruction":"Extend arms and make circles, 10 times forward, 10 times backward"}]'
      : '示例输出：[{"name":"手臂画圈","duration":30,"instruction":"双臂伸直画圈，向前10次，向后10次"}]',
    isEn ? 'Only output JSON, no other text.' : '只输出 JSON，不要其他文字。',
  ].filter(Boolean).join('\n');
  return [
    { role: 'system', content: sys },
    { role: 'user', content: user },
  ];
}
