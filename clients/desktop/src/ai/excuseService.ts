import type { ChatMessage } from './prompts';
import { aiChat } from './aiService';

export async function decideExcuse(messages: ChatMessage[]): Promise<{ minutes: number; reply: string }> {
  const content = await aiChat(messages);
  try {
    const jsonText = content.match(/\{[\s\S]*\}/)?.[0] ?? content;
    const parsed = JSON.parse(jsonText);
    const minutesRaw = typeof parsed?.minutes === 'number' ? parsed.minutes : Number(parsed?.minutes);
    const reply = typeof parsed?.reply === 'string' ? parsed.reply : '';
    return {
      minutes: Number.isFinite(minutesRaw) ? Math.max(0, Math.floor(minutesRaw)) : 0,
      reply,
    };
  } catch {
    return { minutes: 0, reply: content.trim() };
  }
}
