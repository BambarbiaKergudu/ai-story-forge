import { z } from 'zod';

/** Кто подписывает вызов `web` → `api`. Проверка — на стороне API. */
export const SERVICE_JWT_ISSUER = 'asf-web';
export const SERVICE_JWT_AUDIENCE = 'asf-api';
/** Один вызов, не сессия. Просроченный токен повторить нельзя. */
export const SERVICE_JWT_TTL_SECONDS = 60;

export const SERVICE_ROLES = ['user', 'guest'] as const;

const userClaimsSchema = z.object({
  role: z.literal('user'),
  userId: z.string().min(1),
  email: z.email(),
});

const guestClaimsSchema = z.object({
  role: z.literal('guest'),
  guestKey: z.string().min(8).max(200),
});

/** Payload сервисного JWT без служебных `iss` / `exp`: их добавляет подпись. */
export const serviceJwtClaimsSchema = z.discriminatedUnion('role', [
  userClaimsSchema,
  guestClaimsSchema,
]);

export type ServiceJwtClaims = z.infer<typeof serviceJwtClaimsSchema>;
