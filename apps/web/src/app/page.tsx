import { healthResponseSchema } from '@asf/contracts';

export const dynamic = 'force-dynamic';

type ApiHealth = { label: 'ok' } | { label: 'fail'; reason: string };

async function getApiHealth(): Promise<ApiHealth> {
  const apiUrl = (process.env.API_URL ?? 'http://127.0.0.1:3001').replace(/\/$/, '');

  try {
    const response = await fetch(`${apiUrl}/v1/health`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) {
      return { label: 'fail', reason: `HTTP ${response.status}` };
    }

    const parsed = healthResponseSchema.safeParse(await response.json());
    return parsed.success ? { label: 'ok' } : { label: 'fail', reason: 'невалидный ответ' };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'сеть';
    return { label: 'fail', reason };
  }
}

export default async function HomePage() {
  const apiHealth = await getApiHealth();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 p-8">
      <h1 className="text-4xl font-bold text-(--color-forge-accent)">AI Story Forge</h1>
      <p className="text-lg text-white/70">Преврати идею в визуальную историю за минуту.</p>
      <p className="text-sm text-white/40">
        Фаза 0 · api: {apiHealth.label === 'ok' ? 'ok' : `fail (${apiHealth.reason})`}
      </p>
    </main>
  );
}
