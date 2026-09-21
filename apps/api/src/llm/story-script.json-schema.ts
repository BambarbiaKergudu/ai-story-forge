import { storyScriptSchema } from '@asf/contracts';
import { z } from 'zod';

/**
 * JSON Schema для Groq strict structured output.
 * Длины строк остаются только в zod: constrained decoding их не гарантирует,
 * а часть провайдеров отвечает 400 на minLength/maxLength.
 */
const STRIPPED_KEYWORDS = new Set(['$schema', 'minLength', 'maxLength']);

export function storyScriptJsonSchema(): Record<string, unknown> {
  const raw: unknown = z.toJSONSchema(storyScriptSchema, { target: 'draft-7' });
  return closeObjects(strip(raw));
}

function strip(node: unknown): unknown {
  if (Array.isArray(node)) {
    return node.map((item) => strip(item));
  }

  if (!isRecord(node)) {
    return node;
  }

  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node)) {
    if (STRIPPED_KEYWORDS.has(key)) {
      continue;
    }
    next[key] = strip(value);
  }
  return next;
}

function closeObjects(node: unknown): Record<string, unknown> {
  if (!isRecord(node)) {
    throw new Error('story script JSON Schema must be an object');
  }

  walk(node);
  return node;
}

function walk(node: unknown): void {
  if (Array.isArray(node)) {
    for (const item of node) {
      walk(item);
    }
    return;
  }

  if (!isRecord(node)) {
    return;
  }

  if (node['type'] === 'object') {
    node['additionalProperties'] = false;
  }

  for (const value of Object.values(node)) {
    walk(value);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
