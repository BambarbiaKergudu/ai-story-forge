import Link from 'next/link';
import { redirect } from 'next/navigation';

import { auth } from '@/auth';

import { AccountForm } from '../account-form';

export const dynamic = 'force-dynamic';

export default async function RegisterPage() {
  const session = await auth();
  if (session?.user?.id) {
    redirect('/');
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl min-w-0 flex-col gap-8 px-[clamp(1rem,4vw,1.5rem)] py-8">
      <header className="flex min-w-0 flex-col gap-2">
        <h1 className="text-[clamp(1.75rem,5vw,2.5rem)] font-bold text-(--color-forge-accent)">
          Регистрация
        </h1>
        <p className="text-base text-white/70">Аккаунт бесплатный. Пароль хранится только в API.</p>
      </header>
      <AccountForm mode="register" />
      <p className="text-sm text-white/70">
        Уже есть аккаунт?{' '}
        <Link href="/login" className="text-white">
          Войти
        </Link>
      </p>
    </main>
  );
}
