/**
 * Fleet canary (Issue #16): fnv1a-64("café Δ 日本語") === 0x024a555471370b18d
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fnv1a_64, FLEET_CANARY, FLEET_CANARY_INPUT, verify_canary } from '../index.ts';

test('FLEET CANARY: fnv1a-64("café Δ 日本語") === 0x024a555471370b18d', () => {
  assert.strictEqual(verify_canary(), true);
  assert.strictEqual(fnv1a_64(FLEET_CANARY_INPUT), FLEET_CANARY);
});

test('FNV-1a basis: empty string returns 0xcbf29ce484222325', () => {
  assert.strictEqual(fnv1a_64(''), 0xcbf29ce484222325n);
});
