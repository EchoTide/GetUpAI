export interface AiProviderConfig {
  baseUrl: string;
  model: string;
  timeoutMs: number;
}

const AI_CONFIG_STATE_KEY = 'ai-config';

export function getDefaultAiProviderConfig(): AiProviderConfig {
  return {
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini',
    timeoutMs: 20000,
  };
}

export function loadAiProviderConfigSync(): AiProviderConfig {
  const fallback = getDefaultAiProviderConfig();
  const raw = window.electronAPI?.getPersistedStateSync?.(AI_CONFIG_STATE_KEY);
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as Partial<AiProviderConfig>;
    return {
      baseUrl: typeof parsed.baseUrl === 'string' && parsed.baseUrl.trim() ? parsed.baseUrl.trim() : fallback.baseUrl,
      model: typeof parsed.model === 'string' && parsed.model.trim() ? parsed.model.trim() : fallback.model,
      timeoutMs:
        typeof parsed.timeoutMs === 'number' && Number.isFinite(parsed.timeoutMs) && parsed.timeoutMs > 0
          ? Math.floor(parsed.timeoutMs)
          : fallback.timeoutMs,
    };
  } catch {
    return fallback;
  }
}

export function saveAiProviderConfigSync(config: AiProviderConfig) {
  window.electronAPI?.setPersistedStateSync?.(AI_CONFIG_STATE_KEY, JSON.stringify(config));
}

export async function loadAiApiKey(): Promise<string | null> {
  return (await window.electronAPI?.aiGetApiKey?.()) ?? null;
}

export async function saveAiApiKey(apiKey: string): Promise<boolean> {
  return (await window.electronAPI?.aiSetApiKey?.(apiKey)) ?? false;
}

export async function clearAiApiKey(): Promise<boolean> {
  return (await window.electronAPI?.aiClearApiKey?.()) ?? false;
}
