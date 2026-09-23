'use server';

import { acceptedStorySchema, createStoryRequestSchema } from '@asf/contracts';
import { redirect } from 'next/navigation';

import { apiFetch } from '@/server/api';
import { currentGuestKey } from '@/server/guest';

export type CreateStoryState = {
  error?: string;
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
    response = await apiFetch(
      '/v1/stories',
      { role: 'guest', guestKey: await currentGuestKey() },
      {
        method: 'POST',
        body: JSON.stringify(parsed.data),
      },
    );
  } catch {
    return { ...values, error: 'Не удалось связаться с сервисом историй.' };
  }

  if (!response.ok) {
    return { ...values, error: failureMessage(response.status) };
  }

  let accepted: { storyId: string };
  try {
    accepted = acceptedStorySchema.parse(await response.json());
  } catch {
    return { ...values, error: 'Сервис вернул неожиданный ответ.' };
  }

  redirect(`/?story=${accepted.storyId}`);
}

function ideaError(paths: unknown[]): string {
  if (paths.includes('idea')) {
    return 'Идея — от 10 до 500 символов.';
  }

  return 'Выберите стиль и качество.';
}

function failureMessage(status: number): string {
  if (status === 502) {
    return 'Не удалось собрать сценарий. Попробуйте ещё раз.';
  }

  if (status === 503) {
    return 'Не удалось поставить историю в очередь. Попробуйте ещё раз.';
  }

  if (status === 400) {
    return 'Проверьте идею: от 10 до 500 символов.';
  }

  return 'Не получилось создать историю.';
}
