#!/usr/bin/env node
/**
 * Tiny CLI over call_model / judge for manual casting-call checks.
 *
 * Usage:
 *   node --experimental-strip-types src/cli.ts chat <provider> <model> "<prompt>"
 *   node --experimental-strip-types src/cli.ts models <provider>
 *   node --experimental-strip-types src/cli.ts judge "<state>" "<question instructions>"
 */
import { call_model, list_models, PROVIDER_REGISTRY } from './providers.ts';
import { judge, list_models as judge_models } from './typesafe.ts';

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);

  if (cmd === 'chat') {
    const [provider, model, prompt] = rest;
    if (!provider || !model || !prompt) {
      console.error('usage: cli.ts chat <provider> <model> "<prompt>"');
      process.exit(1);
    }
    const result = await call_model(provider, model, [{ role: 'user', content: prompt }]);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (cmd === 'models') {
    const [provider] = rest;
    if (provider === 'typesafe') {
      console.log(JSON.stringify(await judge_models(), null, 2));
      return;
    }
    if (!provider || !PROVIDER_REGISTRY[provider]) {
      console.error(`usage: cli.ts models <${[...Object.keys(PROVIDER_REGISTRY), 'typesafe'].join('|')}>`);
      process.exit(1);
    }
    console.log(JSON.stringify(await list_models(provider), null, 2));
    return;
  }

  if (cmd === 'judge') {
    const [state, instructions] = rest;
    if (!state || !instructions) {
      console.error('usage: cli.ts judge "<state>" "<question instructions>"');
      process.exit(1);
    }
    const result = await judge(state, { answer: { type: 'noul', instructions } });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.error('usage: cli.ts <chat|models|judge> ...');
  process.exit(1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
