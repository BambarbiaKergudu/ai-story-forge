import { resolve } from 'node:path';

import { z } from 'zod';

const optionalSecret = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().min(1).optional(),
);

export const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).optional(),
  LOG_LEVEL: z.string().min(1).optional(),
  /**
   * Ключ не обязателен на старте: `/health` должен подниматься без Groq.
   * Пустая строка из `.env` считается отсутствием ключа.
   * `LlmService` отказывает в момент вызова, если переменной нет.
   */
  GROQ_API_KEY: optionalSecret,
  GROQ_MODEL: z.string().min(1).default('openai/gpt-oss-20b'),
  GROQ_BASE_URL: z.string().url().default('https://api.groq.com/openai/v1'),
  /** Общий секрет HS256: `web` подписывает вызов, API проверяет. Минимум 32 символа. */
  SERVICE_JWT_SECRET: z.string().min(32),
  /**
   * Ключи картинок не обязательны на старте: `/health` поднимается без них.
   * Пустая строка из `.env` считается отсутствием ключа.
   */
  FAL_KEY: optionalSecret,
  GEMINI_API_KEY: optionalSecret,
});

export type Env = z.infer<typeof envSchema>;

/** `nest` стартует из `apps/api`, turbo иногда из корня — оба пути. */
export function envFilePaths(): string[] {
  return [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env')];
}

export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment: ${details}`);
  }

  return parsed.data;
}
