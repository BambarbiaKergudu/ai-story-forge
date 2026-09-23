/** Имена очередей из ARCHITECTURE §4. Воркеры живут в том же процессе, что и API. */
export const SCRIPT_QUEUE = 'script';
export const PANEL_IMAGE_QUEUE = 'panel-image';

/** Картинки ограничены двумя, чтобы не ловить 429. Текст держим на том же потолке. */
export const SCRIPT_CONCURRENCY = 2;
export const PANEL_IMAGE_CONCURRENCY = 2;

export const JOB_ATTEMPTS = 3;
export const BACKOFF_TYPE = 'story-forge';

/** 2 с после первой ошибки, 8 с после второй, дальше 30 с. */
export function storyForgeBackoff(attemptsMade: number): number {
  if (attemptsMade <= 1) {
    return 2_000;
  }

  if (attemptsMade === 2) {
    return 8_000;
  }

  return 30_000;
}
