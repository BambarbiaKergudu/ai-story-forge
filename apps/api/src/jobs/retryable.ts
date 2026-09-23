import { ZodError } from 'zod';
import { UnrecoverableError } from 'bullmq';

import { ImageResponseError } from '../images/image.error';
import { LlmResponseError } from '../llm/llm.error';
import { StorageResponseError } from '../storage/storage.error';

/** 429, 5xx, таймаут и обрыв сети повторяем. 4xx, пустой ключ и кривой payload — нет. */
export function isRetryableJobError(error: unknown): boolean {
  if (error instanceof UnrecoverableError || error instanceof ZodError) {
    return false;
  }

  if (error instanceof ImageResponseError || error instanceof StorageResponseError) {
    return error.retryable;
  }

  if (error instanceof LlmResponseError) {
    if (error.kind === 'timeout') {
      return true;
    }

    if (error.kind === 'http' && error.status !== undefined) {
      return error.status === 429 || error.status >= 500;
    }

    return false;
  }

  return true;
}

export function jobErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : 'job failed';
  return message.slice(0, 500);
}
