import { storyResponseSchema, type StoryResponse } from '@asf/contracts';

import { apiFetch } from './api';
import { readGuestKey } from './guest';

export async function loadStory(id: string): Promise<StoryResponse | { error: string }> {
  let response: Response;
  try {
    response = await apiFetch(`/v1/stories/${encodeURIComponent(id)}`, {
      role: 'guest',
      guestKey: await readGuestKey(),
    });
  } catch {
    return { error: 'Не удалось связаться с сервисом историй.' };
  }

  if (response.status === 404) {
    return { error: 'История не найдена.' };
  }

  if (!response.ok) {
    return { error: 'Не удалось открыть историю.' };
  }

  const parsed = storyResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    return { error: 'Сервис вернул неожиданный ответ.' };
  }

  return parsed.data;
}
