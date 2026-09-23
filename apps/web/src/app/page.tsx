import type { StoryResponse } from '@asf/contracts';

import { loadStory } from '@/server/load-story';
import { ANGLE_LABELS, QUALITY_LABELS, SHOT_LABELS, STYLE_LABELS } from './labels';
import { StoryForm } from './story-form';

export const dynamic = 'force-dynamic';

type HomePageProps = {
  searchParams: Promise<{ story?: string | string[] }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const storyId = typeof params.story === 'string' ? params.story : undefined;
  const loaded = storyId ? await loadStory(storyId) : undefined;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl min-w-0 flex-col gap-8 px-[clamp(1rem,4vw,1.5rem)] py-8">
      <header className="flex min-w-0 flex-col gap-2">
        <h1 className="text-[clamp(1.75rem,5vw,2.5rem)] font-bold text-(--color-forge-accent)">
          AI Story Forge
        </h1>
        <p className="text-base text-white/70">Преврати идею в четыре сцены.</p>
      </header>

      <StoryForm />

      {loaded && 'error' in loaded ? (
        <p role="alert" className="text-sm break-words text-(--color-forge-accent)">
          {loaded.error}
        </p>
      ) : null}

      {loaded && 'story' in loaded ? <StoryResult response={loaded} /> : null}
    </main>
  );
}

function StoryResult({ response }: { response: StoryResponse }) {
  const { story, panels } = response;
  const note = statusNote(story.status);

  return (
    <section className="flex min-w-0 flex-col gap-4">
      <header className="flex min-w-0 flex-col gap-1">
        <h2 className="text-xl font-semibold break-words">{story.title ?? 'История создаётся'}</h2>
        {note ? <p className="text-sm break-words text-white/70">{note}</p> : null}
        <p className="text-sm break-words text-white/50">
          {STYLE_LABELS[story.styleId]} · {QUALITY_LABELS[story.quality]}
          {story.characters.length > 0
            ? ` · ${story.characters.map((character) => character.name).join(', ')}`
            : ''}
        </p>
      </header>

      <ol className="flex min-w-0 flex-col gap-3">
        {panels.map((panel) => (
          <li key={panel.id} className="min-w-0 rounded-2xl border border-white/10 p-4">
            <p className="text-sm text-white/50">
              {panel.order}. {SHOT_LABELS[panel.shotType]} · {ANGLE_LABELS[panel.cameraAngle]}
            </p>
            <p className="mt-2 text-base break-words">{panel.caption}</p>
            <p className="mt-3 text-sm break-words text-white/60">{panel.imagePrompt}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function statusNote(status: StoryResponse['story']['status']): string | null {
  if (status === 'DRAFT_PENDING') {
    return 'Сценарий собирается. Обновите страницу через несколько секунд.';
  }

  if (status === 'FAILED') {
    return 'Сценарий собрать не удалось.';
  }

  return null;
}
