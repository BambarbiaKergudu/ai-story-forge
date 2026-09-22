import type { LlmFailureKind, LlmResponseError } from './llm.error';

/** Первая попытка плюс два повтора. Совпадает с лимитом шага SCRIPT в ARCHITECTURE. */
export const SCRIPT_ATTEMPTS = 3;

/**
 * Кривой JSON и провал схемы чинятся текстом ошибки в промпте.
 * Таймаут, HTTP и пустой ключ здесь не повторяем: 5xx и таймаут заберёт очередь,
 * 4xx и отсутствие ключа повтор не исправит.
 */
const RETRYABLE_KINDS = new Set<LlmFailureKind>(['empty', 'invalid_json', 'schema']);

/** Текст для следующей попытки. `undefined` — повторять нельзя, ошибку надо пробросить. */
export function scriptRetryCorrection(error: LlmResponseError, attempt: number): string | undefined {
  if (attempt >= SCRIPT_ATTEMPTS || !RETRYABLE_KINDS.has(error.kind)) {
    return undefined;
  }

  return error.details ?? error.message;
}
