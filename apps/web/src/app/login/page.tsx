import Link from 'next/link';
import { redirect } from 'next/navigation';

import { auth } from '@/auth';

import { AccountForm } from '../account-form';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const session = await auth();
  if (session?.user?.id) {
    redirect('/');
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl min-w-0 flex-col gap-8 px-[clamp(1rem,4vw,1.5rem)] py-8">
      <header className="flex min-w-0 flex-col gap-2">
        <h1 className="text-[clamp(1.75rem,5vw,2.5rem)] font-bold text-(--color-forge-accent)">
          Вход
        </h1>
        <p className="text-base text-white/70">Войдите, чтобы истории сохранялись за аккаунтом.</p>
      </header>
      <AccountForm mode="login" />
      <p className="text-sm text-white/70">
        Нет аккаунта?{' '}
        <Link href="/register" className="text-white">
          Регистрация
        </Link>
      </p>
    </main>
  );
}
