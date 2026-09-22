import type { ServiceJwtClaims } from '@asf/contracts';
import { signServiceJwt } from '@asf/contracts/service-jwt';

/**
 * Серверный вызов API. Секрет остаётся в процессе Next и в токен на 60 секунд,
 * браузер его не получает.
 */
export function signServiceToken(claims: ServiceJwtClaims): string {
  return signServiceJwt(claims, serviceJwtSecret());
}

export async function apiFetch(
  path: string,
  actor: ServiceJwtClaims,
  init?: RequestInit,
): Promise<Response> {
  const apiUrl = (process.env.API_URL ?? 'http://127.0.0.1:3001').replace(/\/$/, '');
  const headers = new Headers(init?.headers);
  headers.set('Authorization', `Bearer ${signServiceToken(actor)}`);
  if (init?.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const suffix = path.startsWith('/') ? path : `/${path}`;
  return fetch(`${apiUrl}${suffix}`, {
    ...init,
    headers,
    cache: 'no-store',
  });
}

function serviceJwtSecret(): string {
  const secret = process.env.SERVICE_JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('SERVICE_JWT_SECRET is not configured');
  }

  return secret;
}
