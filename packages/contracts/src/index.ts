import { z } from 'zod';

/**
 * Заглушка на время Фазы 0: единственный общий контракт, на котором проверяется,
 * что пакет собирается и резолвится и в Next.js, и в NestJS.
 * Реальные схемы сценария появятся в Фазе 1.
 */
export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.string(),
  uptimeSeconds: z.number().nonnegative(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
