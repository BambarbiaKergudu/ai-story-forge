import type { ConnectionOptions } from 'bullmq';

/** Отдельное соединение на очередь и на воркер. `null` нужен BullMQ, иначе команды падают. */
export function redisConnection(redisUrl: string): ConnectionOptions {
  const url = new URL(redisUrl);
  const db = url.pathname.length > 1 ? Number(url.pathname.slice(1)) : undefined;

  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 6379,
    username: url.username ? decodeURIComponent(url.username) : undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    db: db !== undefined && Number.isInteger(db) ? db : undefined,
    maxRetriesPerRequest: null,
  };
}
