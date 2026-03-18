import { PERSONAS } from './models';

/**
 * @author SlyPaws
 * @date 2026-01-29
 * @description 根据用户状态生成 Prompt
 */
export function generatePrompt(
  personaId: string,
  durationMinutes: number,
  excuse: string | null,
  rageLevel: number,
  locale?: string
): string {
  const isEn = locale === 'en';
  const persona = PERSONAS.find(p => p.id === personaId) || PERSONAS[0];
  const basePrompt = (isEn && persona.basePromptEn) ? persona.basePromptEn : persona.basePrompt;
  
  let rageInstruction = '';
  if (isEn) {
    switch (rageLevel) {
      case 1:
        rageInstruction = 'Tone should be slightly contemptuous, just a little mockery.';
        break;
      case 2:
        rageInstruction = 'Tone must be very irritable, highly aggressive, use exclamation marks and rhetorical questions.';
        break;
      case 3:
        rageInstruction = 'Destruction mode! Scold them completely! Threaten to call the police or their boss.';
        break;
      default:
        rageInstruction = 'Tone is peaceful but passive-aggressive.';
    }
  } else {
    switch (rageLevel) {
      case 1:
        rageInstruction = '语气带点轻蔑，稍微嘲讽一下即可。';
        break;
      case 2:
        rageInstruction = '语气要非常暴躁，攻击性要强，可以使用感叹号和反问句。';
        break;
      case 3:
        rageInstruction = '毁灭模式！把他骂得体无完肤！威胁要报警或者打电话给他老板。';
        break;
      default:
        rageInstruction = '语气平和但阴阳怪气。';
    }
  }

  let context = '';
  if (isEn) {
    context = excuse 
      ? `User made an excuse: "${excuse}". You need to logically refute this excuse and humiliate their weakness.`
      : `User has been sitting for ${durationMinutes} minutes continuously.`;
  } else {
    context = excuse 
      ? `用户找了个借口：“${excuse}”。你需要逻辑严密地驳回这个借口，并羞辱他的软弱。`
      : `用户已经连续坐了 ${durationMinutes} 分钟。`;
  }

  if (isEn) {
    return `
    ${basePrompt}
    
    Current Situation:
    ${context}
    
    Rage Level: Level ${rageLevel}
    ${rageInstruction}
    
    Task:
    Generate an aggressive message of no more than 100 words, demanding the user to stand up immediately.
  `;
  } else {
    return `
    ${basePrompt}
    
    当前情况：
    ${context}
    
    愤怒等级：Level ${rageLevel}
    ${rageInstruction}
    
    任务：
    生成一段不超过 100 字的攻击性话术，要求用户立刻站起来。
  `;
  }
}
