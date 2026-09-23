import { createHash } from 'node:crypto';

/**
 * Черновик передаёт один seed во все панели. Колонки у истории пока нет,
 * поэтому seed выводится из id и не меняется между ретраями.
 */
export function storySeed(storyId: string): number {
  const hash = createHash('sha256').update(storyId).digest();
  return (hash.readUInt32BE(0) % 2_147_483_646) + 1;
}
