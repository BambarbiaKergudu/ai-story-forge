import { z } from 'zod';

/** Регистрация и вход. Хеш пароля остаётся в API, в сессию NextAuth не попадает. */
export const registerRequestSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(200),
  name: z.string().max(60).optional(),
});

export type RegisterRequest = z.infer<typeof registerRequestSchema>;

export const loginRequestSchema = z.object({
  email: z.email(),
  password: z.string().min(1).max(200),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

/** Ответ регистрации и входа. `name` пустой, если пользователь его не задал. */
export const authUserSchema = z.object({
  userId: z.string().min(1),
  email: z.email(),
  name: z.string().min(1).nullable(),
});

export type AuthUser = z.infer<typeof authUserSchema>;
