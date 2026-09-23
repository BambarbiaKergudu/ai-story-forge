import sharp from 'sharp';

import { StorageResponseError } from './storage.error';

const WEBP_QUALITY = 80;
/** PNG 1K от провайдера около 1.5 МБ. Запас, чтобы не качать произвольный файл. */
const MAX_SOURCE_BYTES = 15 * 1024 * 1024;
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export function panelObjectKey(storyId: string, panelId: string, attempt: number): string {
  if (!ID_PATTERN.test(storyId) || !ID_PATTERN.test(panelId)) {
    throw new StorageResponseError('invalid', 'storyId and panelId must be url-safe ids');
  }

  if (!Number.isInteger(attempt) || attempt < 1 || attempt > 99) {
    throw new StorageResponseError('invalid', 'attempt must be an integer from 1 to 99');
  }

  return `stories/${storyId}/${panelId}-${attempt}.webp`;
}

export async function encodeWebp(source: Buffer): Promise<Buffer> {
  if (source.length === 0) {
    throw new StorageResponseError('invalid', 'image is empty');
  }

  if (source.length > MAX_SOURCE_BYTES) {
    throw new StorageResponseError('invalid', 'image is larger than 15 MB');
  }

  try {
    return await sharp(source, { failOn: 'error' }).webp({ quality: WEBP_QUALITY }).toBuffer();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'webp encode failed';
    throw new StorageResponseError('invalid', message);
  }
}
