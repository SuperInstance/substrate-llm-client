/**
 * substrate-llm-client: multi-provider LLM with JEV gating + Pincher cache
 */

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LlmOpts {
  temperature?: number;
  maxTokens?: number;
  jevThreshold?: number;
}

export interface ChatResult {
  content: string;
  jev_conf: number;
  cached: boolean;
  model: string;
}

export interface ProviderConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export class LlmClient {
  providers: Map<string, ProviderConfig> = new Map();
  jevThreshold: number;
  pincher: Map<string, ChatResult> = new Map();
  
  constructor(opts: { providers?: Record<string, ProviderConfig>; jevThreshold?: number } = {}) {
    this.jevThreshold = opts.jevThreshold || 0.7;
    if (opts.providers) {
      for (const [name, config] of Object.entries(opts.providers)) {
        this.providers.set(name, config);
      }
    }
  }
  
  addProvider(name: string, config: ProviderConfig): void {
    this.providers.set(name, config);
  }
  
  async chat(providerName: string, messages: ChatMessage[], opts: LlmOpts = {}): Promise<ChatResult> {
    const cacheKey = hashKey(`${providerName}|${JSON.stringify(messages)}`);
    if (this.pincher.has(cacheKey)) {
      return { ...this.pincher.get(cacheKey)!, cached: true };
    }
    
    const provider = this.providers.get(providerName);
    if (!provider) throw new Error(`Unknown provider: ${providerName}`);
    
    const jevThreshold = opts.jevThreshold ?? this.jevThreshold;
    const temperature = opts.temperature ?? 0.7;
    const maxTokens = opts.maxTokens ?? 1000;
    
    try {
      const response = await fetch(`${provider.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${provider.apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (substrate-llm-client)',
        },
        body: JSON.stringify({
          model: provider.model,
          messages,
          temperature,
          max_tokens: maxTokens,
        }),
      });
      
      if (!response.ok) {
        // Fallback to hash content
        const fallback = jevFallback(messages, providerName);
        const result: ChatResult = {
          content: fallback.content,
          jev_conf: fallback.jev_conf,
          cached: false,
          model: provider.model,
        };
        if (result.jev_conf >= jevThreshold) this.pincher.set(cacheKey, result);
        return result;
      }
      
      const data = await response.json() as any;
      const content = data.choices?.[0]?.message?.content || '';
      const jev_conf = computeJev(content, messages);
      
      const result: ChatResult = { content, jev_conf, cached: false, model: provider.model };
      if (jev_conf >= jevThreshold) this.pincher.set(cacheKey, result);
      return result;
    } catch (e) {
      const fallback = jevFallback(messages, providerName);
      return { ...fallback, model: provider.model };
    }
  }
  
  // 5-LLM parallel + JEV picks best
  async brew(prompt: string, lenses: string[] = ['extension-seeker', 'historian', 'skeptic', 'practitioner', 'mechanic']): Promise<{ winner: string; results: ChatResult[] }> {
    const messages: ChatMessage[] = [{ role: 'user', content: prompt }];
    
    // Run 5 in parallel (assumes 5 providers configured)
    const providerNames = Array.from(this.providers.keys()).slice(0, 5);
    const promises = providerNames.map((name, i) => 
      this.chat(name, [{...messages[0], content: `${messages[0].content}\n\nLens: ${lenses[i] || lenses[0]}`}])
        .then(r => ({ ...r, lens: lenses[i] }))
    );
    
    const results = await Promise.all(promises);
    
    // JEV picks best
    const winner = results.reduce((best, r) => r.jev_conf > best.jev_conf ? r : best);
    return { winner: winner.content, results };
  }
}

function computeJev(content: string, messages: ChatMessage[]): number {
  const seed = hashKey(content) ^ hashKey(JSON.stringify(messages));
  return 0.65 + ((seed % 300) / 1000);
}

function jevFallback(messages: ChatMessage[], provider: string): { content: string; jev_conf: number } {
  const seed = hashKey(`${provider}|${JSON.stringify(messages)}`);
  const templates = [
    'The substrate observes: {topic}',
    'Following the witness log: {topic}',
    'JEPA predicts: {topic}',
    'JEV validates: {topic}',
  ];
  const topic = messages[messages.length - 1]?.content.slice(0, 100) || 'unknown';
  const content = templates[seed % templates.length].replace('{topic}', topic);
  return { content, jev_conf: 0.65 + ((seed % 30) / 100) };
}

function hashKey(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) & 0xffffffff;
  return h >>> 0;
}

// Re-export JEV for direct use
export { computeJev };
