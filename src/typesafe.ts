/**
 * Adapter for typesafe.ai's "System One" API — a yes/no ("noul") / choice /
 * score judge over arbitrary content, not a chat model. Its default model
 * is literally named Jev (jev-latest -> resolves to a real id like
 * jev-1.13.0), which is what this repo's JEV-gating concept is named after;
 * computeJev() in index.ts is a local placeholder for this real call.
 */

export type Question =
  | { type: 'noul'; instructions: string }
  | { type: 'choice'; instructions: string; choices: string[] }
  | { type: 'score'; instructions: string; min?: number; max?: number };

export interface SystemOneResult {
  model: string;
  answers: Record<string, { type: string; [k: string]: unknown }>;
  usage: { input_tokens: number; output_tokens: number };
}

const BASE_URL = 'https://api.typesafe.ai/v1';

export async function judge(
  state: string | Record<string, unknown> | unknown[],
  questions: Record<string, Question>,
  model = 'jev-latest',
): Promise<SystemOneResult> {
  const apiKey = process.env.TYPESAFEAI_KEY;
  if (!apiKey) throw new Error('Missing env var TYPESAFEAI_KEY');

  const response = await fetch(`${BASE_URL}/systemone`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, state, questions }),
  });
  if (!response.ok) {
    throw new Error(`typesafe.ai systemone failed: HTTP ${response.status} ${await response.text()}`);
  }
  return (await response.json()) as SystemOneResult;
}

export async function list_models(): Promise<{ name: string; description: string }[]> {
  const apiKey = process.env.TYPESAFEAI_KEY;
  if (!apiKey) throw new Error('Missing env var TYPESAFEAI_KEY');
  const response = await fetch(`${BASE_URL}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!response.ok) throw new Error(`GET /models failed: HTTP ${response.status}`);
  const data = (await response.json()) as any;
  return data.models ?? [];
}
