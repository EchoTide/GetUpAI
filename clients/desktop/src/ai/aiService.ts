import type { ChatMessage } from './prompts';
import { loadAiApiKey, loadAiProviderConfigSync } from './aiConfig';

export type AiStreamEvent =
  | { type: 'delta'; delta: string }
  | { type: 'done' }
  | { type: 'error'; message?: string }
  | { type: 'aborted' };

function extractTextFromRawBody(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  try {
    return extractContent(JSON.parse(trimmed));
  } catch {
    return trimmed;
  }
}

function extractErrorMessage(raw: string, status: number): string {
  const trimmed = raw.trim();
  if (!trimmed) return `AI request failed: ${status}`;
  try {
    const parsed = JSON.parse(trimmed);
    const message =
      parsed?.error?.message ??
      parsed?.message ??
      parsed?.detail ??
      parsed?.error;
    if (typeof message === 'string' && message.trim()) return message.trim();
  } catch {
  }
  return trimmed || `AI request failed: ${status}`;
}

async function ensureOk(res: Response, label: string): Promise<void> {
  if (res.ok) return;
  const raw = typeof res.text === 'function' ? await res.text() : '';
  throw new Error(`${label}: ${extractErrorMessage(raw, res.status)}`);
}

function extractContent(payload: any): string {
  const content = payload?.choices?.[0]?.message?.content ?? payload?.choices?.[0]?.text ?? payload?.content ?? '';
  return typeof content === 'string' ? content : '';
}

async function buildRequestInit(messages: ChatMessage[], stream: boolean, signal?: AbortSignal): Promise<RequestInit> {
  const config = loadAiProviderConfigSync();
  const apiKey = await loadAiApiKey();
  if (!apiKey) {
    throw new Error('Missing AI API key');
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  return {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: config.model,
      stream,
      messages,
    }),
    signal,
  };
}

export async function aiChat(messages: ChatMessage[]): Promise<string> {
  const config = loadAiProviderConfigSync();
  const res = await fetch(config.baseUrl, await buildRequestInit(messages, false));
  await ensureOk(res, 'AI request failed');
  const json = await res.json();
  return extractContent(json);
}

export async function aiChatStream(
  messages: ChatMessage[],
  onText: (fullText: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  if (signal?.aborted) return '';
  const config = loadAiProviderConfigSync();
  const res = await fetch(config.baseUrl, await buildRequestInit(messages, true, signal));
  await ensureOk(res, 'AI stream failed');
  if (!res.body) {
    const json = await res.json();
    const text = extractContent(json);
    onText(text);
    return text;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let acc = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    while (true) {
      const separatorIndex = buffer.indexOf('\n\n');
      if (separatorIndex === -1) break;
      const event = buffer.slice(0, separatorIndex);
      buffer = buffer.slice(separatorIndex + 2);

      for (const line of event.split(/\r?\n/)) {
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (!data) continue;
        if (data === '[DONE]') return acc;
        try {
          const parsed = JSON.parse(data);
          const delta = parsed?.choices?.[0]?.delta?.content ?? '';
          if (typeof delta === 'string' && delta) {
            acc += delta;
            onText(acc);
          }
        } catch {
        }
      }
    }
  }

  if (!acc) {
    const fallbackText = extractTextFromRawBody(buffer);
    if (fallbackText) {
      onText(fallbackText);
      return fallbackText;
    }
  }

  return acc;
}
