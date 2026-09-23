import { apiFetch } from '@/server/api';
import { readGuestKey } from '@/server/guest';

export const dynamic = 'force-dynamic';

/** Браузер не может подписать сервисный JWT. Этот маршрут держит поток открытым. */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  const guestKey = await readGuestKey();

  let upstream: Response;
  try {
    upstream = await apiFetch(
      `/v1/stories/${encodeURIComponent(id)}/events`,
      { role: 'guest', guestKey },
      {
        headers: { Accept: 'text/event-stream' },
        signal: request.signal,
      },
    );
  } catch {
    return new Response('Не удалось открыть поток истории.', { status: 502 });
  }

  const headers = new Headers();
  headers.set(
    'Content-Type',
    upstream.headers.get('Content-Type') ?? 'text/event-stream; charset=utf-8',
  );
  headers.set('Cache-Control', 'no-cache, no-transform');
  headers.set('Connection', 'keep-alive');
  headers.set('X-Accel-Buffering', 'no');

  return new Response(upstream.body, { status: upstream.status, headers });
}
