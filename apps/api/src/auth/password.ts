import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 32;

/**
 * Фиктивный хеш, чтобы отсутствующий пользователь занимал столько же времени,
 * сколько проверка настоящего пароля.
 */
const DUMMY_PASSWORD_HASH =
  'scrypt$bm90LWEtcmVhbC1zYWx0$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('base64url');
  const hash = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return `scrypt$${salt}$${hash.toString('base64url')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, salt, encoded] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !encoded) {
    return false;
  }

  const expected = Buffer.from(encoded, 'base64url');
  const actual = (await scrypt(password, salt, expected.length)) as Buffer;
  if (actual.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(actual, expected);
}

export function dummyPasswordHash(): string {
  return DUMMY_PASSWORD_HASH;
}
