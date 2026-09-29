import Link from 'next/link';

import { auth } from '@/auth';

import { logout } from './account-actions';

export async function AccountNav() {
  const session = await auth();
  const email = session?.user?.email;

  return (
    <div className="mx-auto flex w-full max-w-2xl min-w-0 items-center justify-end gap-4 px-[clamp(1rem,4vw,1.5rem)] pt-4 text-sm text-white/70">
      {email ? (
        <>
          <span className="min-w-0 truncate">{email}</span>
          <form action={logout}>
            <button type="submit" className="text-white">
              Выйти
            </button>
          </form>
        </>
      ) : (
        <>
          <Link href="/login" className="text-white">
            Войти
          </Link>
          <Link href="/register" className="text-white">
            Регистрация
          </Link>
        </>
      )}
    </div>
  );
}
