export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export interface AppStateSnapshot {
  mode: 'sitting' | 'standing' | 'standing_work' | 'paused';
  sitStartAt: number | null;
  standStartAt: number | null;
  standWorkStartAt: number | null;
  lastActiveAt: number | null;
  pauseUntil: number | null;
  pauseReason: 'manual' | 'rest' | 'dnd' | 'idle' | 'lock' | null;
  restSuppressedUntil: number | null;
  nextReminderAt: number;
  settings: Record<string, unknown>;
  day: Record<string, unknown>;
  dayHistory: Record<string, unknown>[];
  logs: Record<string, unknown>[];
  aiLastNudge: string | null;
  aiLastNudgeAt: number | null;
  aiInsightLatest: Record<string, unknown> | null;
  aiInsightHistory: Record<string, unknown>[];
  periodStats: Record<string, unknown>;
  consecutiveIgnores: number;
  achievements: Record<string, unknown>;
}

export interface SyncStatePayload {
  state: AppStateSnapshot;
  updatedAt: string;
}

export interface SyncStateResponse {
  state: AppStateSnapshot | null;
  updatedAt: string | null;
  conflict: boolean;
}

export interface AiChatRequest {
  messages: ChatMessage[];
}

export interface AiChatResponse {
  content: string;
}

export interface AiExcuseDecideRequest {
  messages: ChatMessage[];
}

export interface AiExcuseDecideResponse {
  minutes: number;
  reply: string;
}

export interface AiUsageResponse {
  count: number;
  limit: number;
  resetAt: string;
}

export interface ApiError {
  error: string;
  code: string;
}
