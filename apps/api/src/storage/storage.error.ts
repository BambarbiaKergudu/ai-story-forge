export type StorageFailureKind = 'unconfigured' | 'invalid' | 'timeout' | 'network' | 'http';

/**
 * Ошибка шага хранения. Повтор решает очередь: 429, 5xx, таймаут и обрыв сети
 * можно повторить, битый файл и пустой конфиг R2 — нет.
 */
export class StorageResponseError extends Error {
  readonly kind: StorageFailureKind;
  readonly status?: number;

  constructor(kind: StorageFailureKind, message: string, extra?: { status?: number }) {
    super(message);
    this.name = 'StorageResponseError';
    this.kind = kind;
    this.status = extra?.status;
  }

  get retryable(): boolean {
    if (this.kind === 'timeout' || this.kind === 'network') {
      return true;
    }

    if (this.kind !== 'http' || this.status === undefined) {
      return false;
    }

    return this.status === 429 || this.status >= 500;
  }
}
