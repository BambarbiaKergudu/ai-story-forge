'use client';

import type { StoryResponse, StoryStatus } from '@asf/contracts';
import Image from 'next/image';

import { ANGLE_LABELS, QUALITY_LABELS, SHOT_LABELS, STYLE_LABELS } from './labels';
import { useStoryStream } from './use-story-stream';

export function StoryLive({ initial }: { initial: StoryResponse }) {
  const { story, panels } = useStoryStream(initial);
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
        {panels.map((panel) => {
          const hasDetails = panel.imagePrompt.length > 0;

          return (
            <li key={panel.id} className="min-w-0 rounded-2xl border border-white/10 p-4">
              {hasDetails ? (
                <p className="text-sm text-white/50">
                  {panel.order}. {SHOT_LABELS[panel.shotType]} · {ANGLE_LABELS[panel.cameraAngle]}
                </p>
              ) : (
                <p className="text-sm text-white/50">{panel.order}.</p>
              )}
              <p className="mt-2 text-base break-words">{panel.caption}</p>
              {panel.imageUrl ? (
                <div className="relative mt-3 aspect-[4/3] overflow-hidden rounded-xl">
                  <Image
                    src={panel.imageUrl}
                    alt={panel.caption}
                    fill
                    className="object-cover"
                    sizes="(max-width: 42rem) 100vw, 42rem"
                  />
                </div>
              ) : null}
              {panelStatusNote(panel.status)}
              {hasDetails ? (
                <p className="mt-3 text-sm break-words text-white/60">{panel.imagePrompt}</p>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function panelStatusNote(status: StoryResponse['panels'][number]['status']) {
  if (status === 'GENERATING') {
    return <p className="mt-2 text-sm text-white/50">Рисуется…</p>;
  }

  if (status === 'FAILED') {
    return <p className="mt-2 text-sm text-(--color-forge-accent)">Кадр не собрался.</p>;
  }

  return null;
}

function statusNote(status: StoryStatus): string | null {
  if (status === 'DRAFT_PENDING') {
    return 'Сценарий собирается.';
  }

  if (status === 'SCRIPT_READY' || status === 'RENDERING') {
    return 'Кадры рисуются по очереди.';
  }

  if (status === 'PARTIAL') {
    return 'Часть кадров не собралась.';
  }

  if (status === 'FAILED') {
    return 'Сценарий собрать не удалось.';
  }

  return null;
}
