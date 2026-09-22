import { cookies } from 'next/headers';
import { randomBytes } from 'node:crypto';

const GUEST_COOKIE = 'asf_guest';

/** Один ключ на браузер. Пишется только из server action: в рендере cookie ставить нельзя. */
export async function currentGuestKey(): Promise<string> {
  const jar = await cookies();
  const existing = readKey(jar.get(GUEST_COOKIE)?.value);
  if (existing) {
    return existing;
  }

  const key = randomBytes(18).toString('base64url');
  jar.set(GUEST_COOKIE, key, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
  return key;
}

/** Чтение без записи: страница может открыть историю, не создавая cookie. */
export async function readGuestKey(): Promise<string> {
  const jar = await cookies();
  return readKey(jar.get(GUEST_COOKIE)?.value) ?? 'read-only-guest';
}

function readKey(value: string | undefined): string | undefined {
  if (value && value.length >= 8 && value.length <= 200) {
    return value;
  }

  return undefined;
}
