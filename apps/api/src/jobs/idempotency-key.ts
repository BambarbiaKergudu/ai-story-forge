import { createHash } from 'node:crypto';

import type { JobKind } from '@prisma/client';

/**
 * Один и тот же ключ у повторной доставки и у строки `GenerationJob`.
 * Пока задача уже успешна, провайдера не зовём второй раз.
 */
export function idempotencyKey(input: {
  storyId: string;
  kind: JobKind;
  panelId?: string;
  attempt: number;
}): string {
  const material = [input.storyId, input.kind, input.panelId ?? '', String(input.attempt)].join(
    '\n',
  );
  return createHash('sha256').update(material).digest('hex');
}
