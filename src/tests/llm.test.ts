import { test } from 'node:test';
import assert from 'node:assert';
import { LlmClient, computeJev } from '../index.ts';

test('LlmClient constructor', () => {
  const c = new LlmClient();
  assert.strictEqual(c.providers.size, 0);
});

test('addProvider', () => {
  const c = new LlmClient();
  c.addProvider('deepinfra', { baseUrl: 'https://x', apiKey: 'k', model: 'm' });
  assert.strictEqual(c.providers.size, 1);
});

test('computeJev in [0.65, 0.95]', () => {
  for (let i = 0; i < 20; i++) {
    const s = computeJev('hello', [{ role: 'user', content: 'world' }]);
    assert.ok(s >= 0.65 && s <= 0.95);
  }
});
