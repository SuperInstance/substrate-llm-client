# substrate-llm-client

Multi-provider LLM with JEV gating + Pincher cache.

```typescript
import { LlmClient } from 'substrate-llm-client';

const client = new LlmClient();
client.addProvider('deepinfra', {
  baseUrl: 'https://api.deepinfra.com/v1/openai',
  apiKey: process.env.DEEPINFRA_TOKEN,
  model: 'Qwen/Qwen3-32B',
});

const result = await client.chat('deepinfra', [
  { role: 'user', content: 'what is the substrate?' }
]);
// result.jev_conf in [0.65, 0.95], cached if high enough

const brew = await client.brew('when cells compose, what happens?');
// brew.winner is best of 5 parallel LLM calls
```
