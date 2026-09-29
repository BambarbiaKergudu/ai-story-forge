import type { ServiceJwtClaims } from '@asf/contracts';

import { auth } from '@/auth';

import { currentGuestKey, readGuestKey } from './guest';

/** Мутация: вошедший пользователь, иначе гость с cookie. */
export async function currentActor(): Promise<ServiceJwtClaims> {
  const sessionActor = await readSessionActor();
  if (sessionActor) {
    return sessionActor;
  }

  return { role: 'guest', guestKey: await currentGuestKey() };
}

/** Чтение: cookie гостя не создаём, если сессии нет. */
export async function readActor(): Promise<ServiceJwtClaims> {
  const sessionActor = await readSessionActor();
  if (sessionActor) {
    return sessionActor;
  }

  return { role: 'guest', guestKey: await readGuestKey() };
}

async function readSessionActor(): Promise<ServiceJwtClaims | undefined> {
  const session = await auth();
  const userId = session?.user?.id;
  const email = session?.user?.email;
  if (!userId || !email) {
    return undefined;
  }

  return { role: 'user', userId, email };
}
