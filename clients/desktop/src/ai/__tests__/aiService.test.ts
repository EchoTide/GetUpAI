import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('aiService direct provider mode', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    globalThis.fetch = mockFetch;
    mockFetch.mockReset();
    (window as any).electronAPI = {
      getPersistedStateSync: vi.fn().mockImplementation((name: string) => {
        if (name !== 'ai-config') return null;
        return JSON.stringify({
          baseUrl: 'https://api.example.com/v1/chat/completions',
          model: 'gpt-4o-mini',
          timeoutMs: 12000,
        });
      }),
      aiGetApiKey: vi.fn().mockResolvedValue('sk-test'),
    };
  });

  afterEach(() => {
    delete (window as any).electronAPI;
    vi.restoreAllMocks();
  });

  async function loadModule() {
    vi.resetModules();
    return import('../aiService');
  }

  describe('aiChat', () => {
    it('calls the configured OpenAI-compatible endpoint with bearer auth', async () => {
      const { aiChat } = await loadModule();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'Stand up now' } }] }),
      });

      const result = await aiChat([{ role: 'user', content: 'hi' }]);

      expect(result).toBe('Stand up now');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer sk-test',
            'Content-Type': 'application/json',
          }),
        }),
      );
      expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({
        model: 'gpt-4o-mini',
        stream: false,
        messages: [{ role: 'user', content: 'hi' }],
      });
    });

    it('surfaces provider error details from the response body', async () => {
      const { aiChat } = await loadModule();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => JSON.stringify({ error: { message: 'Invalid API key provided.' } }),
      });

      await expect(aiChat([{ role: 'user', content: 'hi' }])).rejects.toThrow('Invalid API key provided.');
    });
  });

  describe('aiChatStream', () => {
    it('streams deltas from the configured provider endpoint', async () => {
      const { aiChatStream } = await loadModule();
      const onText = vi.fn();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n'));
          controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":" world"}}]}\n\n'));
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
          controller.close();
        },
      });
      mockFetch.mockResolvedValueOnce({ ok: true, body: stream });

      const result = await aiChatStream([{ role: 'user', content: 'hello' }], onText);

      expect(result).toBe('Hello world');
      expect(onText).toHaveBeenCalledWith('Hello');
      expect(onText).toHaveBeenCalledWith('Hello world');
      expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({
        model: 'gpt-4o-mini',
        stream: true,
        messages: [{ role: 'user', content: 'hello' }],
      });
    });

    it('falls back to parsing a normal JSON body when a provider ignores SSE streaming', async () => {
      const { aiChatStream } = await loadModule();
      const onText = vi.fn();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            new TextEncoder().encode(
              JSON.stringify({ choices: [{ message: { content: 'You have been sitting too long.' } }] }),
            ),
          );
          controller.close();
        },
      });
      mockFetch.mockResolvedValueOnce({ ok: true, body: stream });

      const result = await aiChatStream([{ role: 'user', content: 'wake me up' }], onText);

      expect(result).toBe('You have been sitting too long.');
      expect(onText).toHaveBeenCalledWith('You have been sitting too long.');
    });
  });
});
