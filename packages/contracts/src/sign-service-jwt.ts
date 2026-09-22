import { createHmac, timingSafeEqual } from 'node:crypto';

import {
  SERVICE_JWT_AUDIENCE,
  SERVICE_JWT_ISSUER,
  SERVICE_JWT_TTL_SECONDS,
  serviceJwtClaimsSchema,
  type ServiceJwtClaims,
} from './service-jwt';

const CLOCK_SKEW_MS = 5_000;

export class ServiceJwtError extends Error {
  constructor() {
    super('Invalid service token');
    this.name = 'ServiceJwtError';
  }
}

export function signServiceJwt(claims: ServiceJwtClaims, secret: string, nowMs = Date.now()): string {
  assertSecret(secret);
  const parsed = serviceJwtClaimsSchema.parse(claims);
  const issuedAt = Math.floor(nowMs / 1000);
  const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64Url(
    JSON.stringify({
      ...parsed,
      iss: SERVICE_JWT_ISSUER,
      aud: SERVICE_JWT_AUDIENCE,
      iat: issuedAt,
      exp: issuedAt + SERVICE_JWT_TTL_SECONDS,
    }),
  );
  const unsigned = `${header}.${payload}`;
  return `${unsigned}.${sign(unsigned, secret)}`;
}

export function verifyServiceJwt(token: string, secret: string, nowMs = Date.now()): ServiceJwtClaims {
  assertSecret(secret);
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new ServiceJwtError();
  }

  const [headerPart, payloadPart, signature] = parts;
  if (!headerPart || !payloadPart || !signature) {
    throw new ServiceJwtError();
  }

  const unsigned = `${headerPart}.${payloadPart}`;
  const expected = sign(unsigned, secret);
  if (!safeEqual(signature, expected)) {
    throw new ServiceJwtError();
  }

  let header: unknown;
  let payload: unknown;
  try {
    header = JSON.parse(Buffer.from(headerPart, 'base64url').toString('utf8')) as unknown;
    payload = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8')) as unknown;
  } catch {
    throw new ServiceJwtError();
  }

  if (!isRecord(header) || header.alg !== 'HS256' || !isRecord(payload)) {
    throw new ServiceJwtError();
  }

  if (payload.iss !== SERVICE_JWT_ISSUER || payload.aud !== SERVICE_JWT_AUDIENCE) {
    throw new ServiceJwtError();
  }

  if (typeof payload.exp !== 'number' || payload.exp * 1000 + CLOCK_SKEW_MS < nowMs) {
    throw new ServiceJwtError();
  }

  if (typeof payload.iat !== 'number' || payload.iat * 1000 > nowMs + CLOCK_SKEW_MS) {
    throw new ServiceJwtError();
  }

  const claims = serviceJwtClaimsSchema.safeParse(payload);
  if (!claims.success) {
    throw new ServiceJwtError();
  }

  return claims.data;
}

function sign(unsigned: string, secret: string): string {
  return createHmac('sha256', secret).update(unsigned).digest('base64url');
}

function safeEqual(actual: string, expected: string): boolean {
  const actualBuf = Buffer.from(actual);
  const expectedBuf = Buffer.from(expected);
  if (actualBuf.length !== expectedBuf.length) {
    return false;
  }

  return timingSafeEqual(actualBuf, expectedBuf);
}

function assertSecret(secret: string): void {
  if (secret.length < 32) {
    throw new Error('SERVICE_JWT_SECRET is too short');
  }
}

function base64Url(value: string): string {
  return Buffer.from(value).toString('base64url');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
