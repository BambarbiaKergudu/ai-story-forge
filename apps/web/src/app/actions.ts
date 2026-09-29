'use server';

import {
  acceptedStorySchema,
  createStoryRequestSchema,
  GUEST_DAILY_LIMIT_CODE,
  type StoryResponse,
} from '@asf/contracts';
import { redirect } from 'next/navigation';

import { apiFetch } from '@/server/api';
import { currentActor } from '@/server/actor';
import { loadStory } from '@/server/load-story';

export type CreateStoryState = {
  error?: string;
  /** Четвёртая история гостя за сутки: рядом с текстом ссылка на регистрацию. */
  guestLimit?: boolean;
  idea?: string;
  styleId?: string;
  quality?: string;
};

export async function createStory(
  _prev: CreateStoryState,
  formData: FormData,
): Promise<CreateStoryState> {
  const idea = String(formData.get('idea') ?? '');
  const styleId = String(formData.get('styleId') ?? '');
  const quality = String(formData.get('quality') ?? '');
  const values = { idea, styleId, quality };

  const parsed = createStoryRequestSchema.safeParse({ idea, styleId, quality });
  if (!parsed.success) {
    return { ...values, error: ideaError(parsed.error.issues.map((issue) => issue.path[0])) };
  }

  let response: Response;
  try {
    response = await apiFetch('/v1/stories', await currentActor(), {
      method: 'POST',
      body: JSON.stringify(parsed.data),
    });
  } catch {
    return { ...values, error: 'Не удалось связаться с сервисом историй.' };
  }

  if (!response.ok) {
    return { ...values, ...(await failureState(response)) };
  }

  let accepted: { storyId: string };
  try {
    accepted = acceptedStorySchema.parse(await response.json());
  } catch {
    return { ...values, error: 'Сервис вернул неожиданный ответ.' };
  }

  redirect(`/?story=${accepted.storyId}`);
}

/** Снимок истории после разрыва SSE. Состояние в базе главнее пропущенных событий. */
export async function reloadStory(id: string): Promise<StoryResponse | { error: string }> {
  return loadStory(id);
}

function ideaError(paths: unknown[]): string {
  if (paths.includes('idea')) {
    return 'Идея — от 10 до 500 символов.';
  }

  return 'Выберите стиль и качество.';
}

async function failureState(
  response: Response,
): Promise<Pick<CreateStoryState, 'error' | 'guestLimit'>> {
  if (response.status === 429 && (await readErrorCode(response)) === GUEST_DAILY_LIMIT_CODE) {
    return {
      guestLimit: true,
      error: 'За сутки без аккаунта можно собрать три истории.',
    };
  }

  if (response.status === 502) {
    return { error: 'Не удалось собрать сценарий. Попробуйте ещё раз.' };
  }

  if (response.status === 503) {
    return { error: 'Не удалось поставить историю в очередь. Попробуйте ещё раз.' };
  }

  if (response.status === 400) {
    return { error: 'Проверьте идею: от 10 до 500 символов.' };
  }

  return { error: 'Не получилось создать историю.' };
}

async function readErrorCode(response: Response): Promise<string | undefined> {
  try {
    const body: unknown = await response.json();
    if (body && typeof body === 'object' && 'code' in body && typeof body.code === 'string') {
      return body.code;
    }
  } catch {
    return undefined;
  }

  return undefined;
}
