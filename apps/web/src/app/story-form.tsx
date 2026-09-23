'use client';

import { useActionState } from 'react';

import { createStory, type CreateStoryState } from './actions';
import { qualityOptions, styleOptions } from './labels';

const initialState: CreateStoryState = {
  styleId: 'noir-neon',
  quality: 'draft',
};

export function StoryForm() {
  const [state, action, pending] = useActionState(createStory, initialState);

  return (
    <form action={action} className="flex w-full min-w-0 flex-col gap-4">
      <label className="flex min-w-0 flex-col gap-2 text-sm text-white/70">
        Идея
        <textarea
          name="idea"
          required
          minLength={10}
          maxLength={500}
          rows={4}
          defaultValue={state.idea}
          placeholder="Кот-детектив ищет золотую рыбку в неоновом мегаполисе"
          className="min-h-28 w-full min-w-0 resize-y rounded-xl border border-white/15 bg-white/5 px-3 py-3 text-base text-white outline-none placeholder:text-white/30"
        />
      </label>

      <div className="grid w-full min-w-0 [grid-template-columns:repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-4">
        <label className="flex min-w-0 flex-col gap-2 text-sm text-white/70">
          Стиль
          <select
            name="styleId"
            defaultValue={state.styleId ?? 'noir-neon'}
            className="forge-select min-h-11 w-full min-w-0 rounded-xl border border-white/15 bg-white/5 px-3 text-base text-white"
          >
            {styleOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-w-0 flex-col gap-2 text-sm text-white/70">
          Качество
          <select
            name="quality"
            defaultValue={state.quality ?? 'draft'}
            className="forge-select min-h-11 w-full min-w-0 rounded-xl border border-white/15 bg-white/5 px-3 text-base text-white"
          >
            {qualityOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

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
        {pending ? 'Создаю историю…' : 'Собрать историю'}
      </button>
    </form>
  );
}
