import { healthResponseSchema } from '@asf/contracts';

// Временная проверка: общий пакет контрактов резолвится и работает в серверном
// компоненте. В Фазе 1 отсюда уедет реальный вызов API.
const selfCheck = healthResponseSchema.safeParse({
  status: 'ok',
  service: 'web',
  uptimeSeconds: 0,
});

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 p-8">
      <h1 className="text-4xl font-bold text-(--color-forge-accent)">AI Story Forge</h1>
      <p className="text-lg text-white/70">Преврати идею в визуальную историю за минуту.</p>
      <p className="text-sm text-white/40">
        Фаза 0 · контракты: {selfCheck.success ? 'подключены' : 'не резолвятся'}
      </p>
    </main>
  );
}
