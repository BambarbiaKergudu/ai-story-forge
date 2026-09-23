export type ImageFailureKind = 'unconfigured' | 'invalid' | 'timeout' | 'network' | 'http' | 'empty';

/**
 * Ошибка шага картинки. Повтор решает очередь: 429, 5xx, таймаут и обрыв сети
 * можно повторить, 4xx и отсутствие ключа — нет.
 */
export class ImageResponseError extends Error {
  readonly kind: ImageFailureKind;
  readonly status?: number;
  readonly details?: string;

  constructor(
    kind: ImageFailureKind,
    message: string,
    extra?: { status?: number; details?: string },
  ) {
    super(message);
    this.name = 'ImageResponseError';
    this.kind = kind;
    this.status = extra?.status;
    this.details = extra?.details;
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
