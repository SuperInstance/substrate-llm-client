/**
 * Provider registry + call_model: a thin, dependency-light adapter over the
 * OpenAI-compatible /chat/completions shape that DeepSeek, DeepInfra,
 * z.ai/Zhipu GLM, and Kimi/Moonshot all speak. Base URLs and keys are read
 * from env so nothing secret ever lives in source or git history.
 */

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface CallOpts {
  temperature?: number;
  maxTokens?: number;
}

export interface CallResult {
  ok: boolean;
  status: number | null;
  latencyMs: number;
  content: string;
  usage?: Record<string, unknown>;
  error?: string;
}

export interface ProviderEntry {
  envKey: string;
  baseUrl: string;
  defaultModel: string;
  notes: string;
}

// Real model ids confirmed live against each provider's GET /models on 2026-09-27.
// See ROSTER.md for the full catalog and per-model role assignments.
export const PROVIDER_REGISTRY: Record<string, ProviderEntry> = {
  deepseek: {
    envKey: 'DEEPSEEK_KEY',
    baseUrl: 'https://api.deepseek.com',
    defaultModel: 'deepseek-flash',
    notes: 'Native prompt-cache accounting (prompt_cache_hit_tokens) — best cache-gaming ROI.',
  },
  deepinfra: {
    envKey: 'DEEPINFRA_KEY',
    baseUrl: 'https://api.deepinfra.com/v1/openai',
    defaultModel: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
    notes: '187-model catalog. Reasoning-heavy models (e.g. Qwen3.5-27B) can burn the whole maxTokens budget on hidden reasoning and return empty content — pass a generous maxTokens.',
  },
  zai: {
    envKey: 'ZAI_KEY',
    baseUrl: 'https://api.z.ai/api/paas/v4',
    defaultModel: 'glm-4.5-air',
    notes: 'Also reachable at https://open.bigmodel.cn/api/paas/v4 with the same key/models. Auth confirmed; account balance may block completions (HTTP 429 code 1113).',
  },
  kimi: {
    envKey: 'KIMIAI_KEY',
    baseUrl: 'https://api.moonshot.ai/v1',
    defaultModel: 'kimi-k2.6',
    notes: 'Use .ai, not .cn (the .cn host 401s on this key). Auth confirmed; account may be billing-suspended for completions.',
  },
};

export async function call_model(
  provider: string,
  model: string,
  messages: ChatMessage[],
  opts: CallOpts = {},
): Promise<CallResult> {
  const entry = PROVIDER_REGISTRY[provider];
  if (!entry) throw new Error(`Unknown provider: ${provider}`);

  const apiKey = process.env[entry.envKey];
  if (!apiKey) throw new Error(`Missing env var ${entry.envKey} for provider ${provider}`);

  const url = `${entry.baseUrl.replace(/\/$/, '')}/chat/completions`;
  const t0 = Date.now();
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: opts.temperature ?? 0.7,
        max_tokens: opts.maxTokens ?? 1000,
      }),
    });
    const latencyMs = Date.now() - t0;
    const data = (await response.json()) as any;

    if (!response.ok) {
      return { ok: false, status: response.status, latencyMs, content: '', error: JSON.stringify(data) };
    }
    const content = data.choices?.[0]?.message?.content ?? '';
    return { ok: true, status: response.status, latencyMs, content, usage: data.usage };
  } catch (e) {
    return { ok: false, status: null, latencyMs: Date.now() - t0, content: '', error: String(e) };
  }
}

export async function list_models(provider: string): Promise<string[]> {
  const entry = PROVIDER_REGISTRY[provider];
  if (!entry) throw new Error(`Unknown provider: ${provider}`);
  const apiKey = process.env[entry.envKey];
  if (!apiKey) throw new Error(`Missing env var ${entry.envKey} for provider ${provider}`);

  const response = await fetch(`${entry.baseUrl.replace(/\/$/, '')}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!response.ok) throw new Error(`GET /models failed: HTTP ${response.status}`);
  const data = (await response.json()) as any;
  return (data.data ?? []).map((m: any) => m.id);
}
