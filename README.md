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

## Multi-provider roster client

`src/providers.ts` and `src/typesafe.ts` add a thin, dependency-light layer
over the account's actual provider keys (read from env, never hardcoded):

```typescript
import { call_model } from './src/providers.ts';
import { judge } from './src/typesafe.ts';

const r = await call_model('deepseek', 'deepseek-flash', [
  { role: 'user', content: 'what is the substrate?' },
]);

const g = await judge('some content', {
  onTopic: { type: 'noul', instructions: 'Is this about billing?' },
});
```

CLI:

```
node --experimental-strip-types src/cli.ts chat deepseek deepseek-flash "hello"
node --experimental-strip-types src/cli.ts models deepinfra
node --experimental-strip-types src/cli.ts judge "some content" "Is this confident?"
```

See `ROSTER.md` for the full per-provider/per-model writeup (endpoints,
real model ids, cost tier, quirks, and assigned org role).
