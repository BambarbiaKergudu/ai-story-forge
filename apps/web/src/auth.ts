import { authUserSchema, loginRequestSchema, type ServiceJwtClaims } from '@asf/contracts';
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

import { apiFetch } from '@/server/api';

/** Вызов регистрации и входа идёт с сервера Next, пользователя ещё нет. */
const AUTH_GATEWAY: ServiceJwtClaims = { role: 'guest', guestKey: 'web-auth-gateway' };

/** Срок cookie от момента входа. `updateAge` равен ему, иначе Auth.js продлевает сессию при заходе. */
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: authSecret(),
  trustHost: true,
  session: {
    strategy: 'jwt',
    maxAge: SESSION_MAX_AGE_SECONDS,
    updateAge: SESSION_MAX_AGE_SECONDS,
  },
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Почта' },
        password: { label: 'Пароль' },
      },
      authorize: async (credentials) => {
        const parsed = loginRequestSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        let response: Response;
        try {
          response = await apiFetch('/v1/auth/login', AUTH_GATEWAY, {
            method: 'POST',
            body: JSON.stringify(parsed.data),
          });
        } catch {
          return null;
        }

        if (!response.ok) {
          return null;
        }

        const user = authUserSchema.safeParse(await response.json());
        if (!user.success) {
          return null;
        }

        return {
          id: user.data.userId,
          email: user.data.email,
          name: user.data.name ?? undefined,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});

function authSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('AUTH_SECRET is not configured');
  }

  return secret;
}
