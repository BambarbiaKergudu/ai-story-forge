import { loadStory } from '@/server/load-story';
import { StoryForm } from './story-form';
import { StoryLive } from './story-live';

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

      {loaded && 'story' in loaded ? <StoryLive key={loaded.story.id} initial={loaded} /> : null}
    </main>
  );
}
