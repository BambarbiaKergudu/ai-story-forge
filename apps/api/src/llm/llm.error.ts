export type LlmFailureKind = 'unconfigured' | 'timeout' | 'http' | 'empty' | 'invalid_json' | 'schema';

/**
 * Ошибка текстового шага. `details` уходит в промпт следующей попытки,
 * если вид ошибки повторный (`empty`, `invalid_json`, `schema`).
 */
export class LlmResponseError extends Error {
  readonly kind: LlmFailureKind;
  readonly status?: number;
  readonly details?: string;

  constructor(
    kind: LlmFailureKind,
    message: string,
    extra?: { status?: number; details?: string },
  ) {
    super(message);
    this.name = 'LlmResponseError';
    this.kind = kind;
    this.status = extra?.status;
    this.details = extra?.details;
  }
}
