'use client';

import { useActionState } from 'react';

import { login, register, type AccountFormState } from './account-actions';

const initialState: AccountFormState = {};

const fieldClass =
  'min-h-11 w-full min-w-0 rounded-xl border border-white/15 bg-white/5 px-3 text-base text-white outline-none placeholder:text-white/30';

export function AccountForm({ mode }: { mode: 'login' | 'register' }) {
  const action = mode === 'register' ? register : login;
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex w-full min-w-0 flex-col gap-4">
      {mode === 'register' ? (
        <label className="flex min-w-0 flex-col gap-2 text-sm text-white/70">
          Имя
          <input
            name="name"
            type="text"
            maxLength={60}
            autoComplete="name"
            defaultValue={state.name}
            className={fieldClass}
          />
        </label>
      ) : null}

      <label className="flex min-w-0 flex-col gap-2 text-sm text-white/70">
        Почта
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={state.email}
          className={fieldClass}
        />
      </label>

      <label className="flex min-w-0 flex-col gap-2 text-sm text-white/70">
        Пароль
        <input
          name="password"
          type="password"
          required
          minLength={mode === 'register' ? 8 : 1}
          maxLength={200}
          autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          className={fieldClass}
        />
      </label>

      {state.error ? (
        <p role="alert" className="text-sm break-words text-(--color-forge-accent)">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="min-h-11 w-full rounded-xl bg-(--color-forge-accent) px-4 text-base font-semibold text-white disabled:opacity-60"
      >
        {pending ? 'Секунду…' : mode === 'register' ? 'Создать аккаунт' : 'Войти'}
      </button>
    </form>
  );
}
