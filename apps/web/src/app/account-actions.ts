'use server';

import { registerRequestSchema, type ServiceJwtClaims } from '@asf/contracts';
import { AuthError } from 'next-auth';
import { redirect } from 'next/navigation';

import { signIn, signOut } from '@/auth';
import { apiFetch } from '@/server/api';

const AUTH_GATEWAY: ServiceJwtClaims = { role: 'guest', guestKey: 'web-auth-gateway' };

export type AccountFormState = {
  error?: string;
  email?: string;
  name?: string;
};

export async function register(
  _prev: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  const values = { email, name };

  const parsed = registerRequestSchema.safeParse({
    email,
    password,
    name: name.length > 0 ? name : undefined,
  });
  if (!parsed.success) {
    return { ...values, error: fieldError(parsed.error.issues.map((issue) => issue.path[0])) };
  }

  let response: Response;
  try {
    response = await apiFetch('/v1/auth/register', AUTH_GATEWAY, {
      method: 'POST',
      body: JSON.stringify(parsed.data),
    });
  } catch {
    return { ...values, error: 'Не удалось связаться с сервисом.' };
  }

  if (response.status === 409) {
    return { ...values, error: 'Эта почта уже зарегистрирована.' };
  }

  if (!response.ok) {
    return { ...values, error: 'Не получилось создать аккаунт.' };
  }

  const signedIn = await signInWithPassword(parsed.data.email, parsed.data.password);
  if (signedIn !== undefined) {
    return { ...values, error: 'Аккаунт создан, но войти не удалось. Откройте страницу входа.' };
  }

  redirect('/');
}

export async function login(
  _prev: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  const values = { email };

  if (!email.includes('@') || password.length === 0) {
    return { ...values, error: 'Укажите почту и пароль.' };
  }

  const signedIn = await signInWithPassword(email, password);
  if (signedIn !== undefined) {
    return { ...values, error: 'Неверная почта или пароль.' };
  }

  redirect('/');
}

export async function logout(): Promise<void> {
  await signOut({ redirectTo: '/' });
}

async function signInWithPassword(email: string, password: string): Promise<string | undefined> {
  try {
    const result: unknown = await signIn('credentials', { email, password, redirect: false });
    if (isSignInError(result)) {
      return 'failed';
    }
    return undefined;
  } catch (error) {
    if (error instanceof AuthError) {
      return 'failed';
    }
    throw error;
  }
}

function isSignInError(result: unknown): boolean {
  return (
    typeof result === 'object' && result !== null && 'error' in result && Boolean(result.error)
  );
}

function fieldError(paths: unknown[]): string {
  if (paths.includes('email')) {
    return 'Укажите почту.';
  }

  if (paths.includes('password')) {
    return 'Пароль — от 8 до 200 символов.';
  }

  if (paths.includes('name')) {
    return 'Имя — до 60 символов.';
  }

  return 'Проверьте поля формы.';
}
