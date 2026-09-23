'use client';

import {
  storyEventSchema,
  STORY_SSE_EVENTS,
  type PanelStatus,
  type StoryEvent,
  type StoryPanelView,
  type StoryResponse,
  type StoryStatus,
} from '@asf/contracts';
import { useEffect, useRef, useState } from 'react';

import { reloadStory } from './actions';

const STORY_RANK: Record<StoryStatus, number> = {
  DRAFT_PENDING: 0,
  SCRIPT_READY: 1,
  RENDERING: 2,
  PARTIAL: 3,
  COMPLETED: 4,
  FAILED: 4,
};

/** Поток больше не нужен: сценарий провалился или все кадры дошли до конца. */
export function isStorySettled(status: StoryStatus): boolean {
  return status === 'COMPLETED' || status === 'PARTIAL' || status === 'FAILED';
}

function pickStoryStatus(local: StoryStatus, incoming: StoryStatus): StoryStatus {
  if (incoming === 'FAILED') {
    return local === 'DRAFT_PENDING' || local === 'FAILED' ? 'FAILED' : local;
  }

  if (local === 'FAILED') {
    return 'FAILED';
  }

  return STORY_RANK[incoming] >= STORY_RANK[local] ? incoming : local;
}

function pickPanelStatus(local: PanelStatus, incoming: PanelStatus): PanelStatus {
  if (local === 'READY' || incoming === 'READY') {
    return 'READY';
  }

  if (local === 'FAILED' || incoming === 'FAILED') {
    return 'FAILED';
  }

  return local === 'GENERATING' || incoming === 'GENERATING' ? 'GENERATING' : 'PENDING';
}

function mergePanel(local: StoryPanelView | undefined, incoming: StoryPanelView): StoryPanelView {
  if (!local) {
    return incoming;
  }

  const details = incoming.imagePrompt.length > 0 ? incoming : local;

  return {
    ...details,
    caption: incoming.caption || local.caption,
    status: pickPanelStatus(local.status, incoming.status),
    imageUrl: incoming.imageUrl ?? local.imageUrl,
  };
}

function mergePanels(current: StoryPanelView[], incoming: StoryPanelView[]): StoryPanelView[] {
  if (incoming.length === 0) {
    return current;
  }

  const byId = new Map(current.map((panel) => [panel.id, panel]));
  return incoming
    .map((panel) => mergePanel(byId.get(panel.id), panel))
    .sort((left, right) => left.order - right.order);
}

/** Снимок из базы не затирает кадр, который поток уже успел дорисовать. */
export function mergeStory(current: StoryResponse, incoming: StoryResponse): StoryResponse {
  return {
    story: {
      ...incoming.story,
      title: incoming.story.title ?? current.story.title,
      status: pickStoryStatus(current.story.status, incoming.story.status),
      characters:
        incoming.story.characters.length > 0 ? incoming.story.characters : current.story.characters,
    },
    panels: mergePanels(current.panels, incoming.panels),
  };
}

function applyEvent(current: StoryResponse, event: StoryEvent): StoryResponse {
  switch (event.event) {
    case 'story.script_ready':
      return mergeStory(current, {
        story: {
          ...current.story,
          title: event.data.title,
          status: 'SCRIPT_READY',
        },
        panels: event.data.panels.map((panel) => ({
          id: panel.id,
          order: panel.order,
          caption: panel.caption,
          imagePrompt: '',
          shotType: 'medium',
          cameraAngle: 'eye-level',
          status: 'PENDING',
          imageUrl: null,
        })),
      });
    case 'panel.generating':
      return {
        ...current,
        story: { ...current.story, status: pickStoryStatus(current.story.status, 'RENDERING') },
        panels: current.panels.map((panel) =>
          panel.id === event.data.panelId
            ? { ...panel, status: pickPanelStatus(panel.status, 'GENERATING') }
            : panel,
        ),
      };
    case 'panel.ready':
      return {
        ...current,
        story: { ...current.story, status: pickStoryStatus(current.story.status, 'RENDERING') },
        panels: current.panels.map((panel) =>
          panel.id === event.data.panelId
            ? { ...panel, status: 'READY', imageUrl: event.data.imageUrl }
            : panel,
        ),
      };
    case 'panel.failed':
      return {
        ...current,
        panels: current.panels.map((panel) =>
          panel.id === event.data.panelId
            ? { ...panel, status: pickPanelStatus(panel.status, 'FAILED') }
            : panel,
        ),
      };
    case 'story.completed':
      return {
        ...current,
        story: {
          ...current.story,
          status: pickStoryStatus(current.story.status, event.data.status),
        },
      };
  }
}

function parseEvent(name: string, raw: string): StoryEvent | null {
  try {
    const parsed = storyEventSchema.safeParse({ event: name, data: JSON.parse(raw) as unknown });
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function useStoryStream(initial: StoryResponse): StoryResponse {
  const [state, setState] = useState(initial);
  const storyId = initial.story.id;
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (isStorySettled(state.story.status)) {
      sourceRef.current?.close();
    }
  }, [state.story.status]);

  useEffect(() => {
    if (isStorySettled(initial.story.status)) {
      return;
    }

    let cancelled = false;
    let restoreTimer = 0;
    const source = new EventSource(`/api/stories/${encodeURIComponent(storyId)}/events`);
    sourceRef.current = source;

    const restore = () => {
      window.clearTimeout(restoreTimer);
      restoreTimer = window.setTimeout(() => {
        void reloadStory(storyId).then((loaded) => {
          if (cancelled || !('story' in loaded)) {
            return;
          }

          setState((current) => mergeStory(current, loaded));
        });
      }, 300);
    };

    const onEvent = (message: Event) => {
      if (!(message instanceof MessageEvent) || typeof message.data !== 'string') {
        return;
      }

      const event = parseEvent(message.type, message.data);
      if (!event) {
        return;
      }

      setState((current) => applyEvent(current, event));

      if (event.event === 'story.script_ready') {
        restore();
      }
    };

    for (const name of STORY_SSE_EVENTS) {
      source.addEventListener(name, onEvent);
    }

    source.onerror = () => {
      restore();
    };

    restore();

    return () => {
      cancelled = true;
      window.clearTimeout(restoreTimer);
      source.close();
      if (sourceRef.current === source) {
        sourceRef.current = null;
      }
    };
  }, [initial.story.status, storyId]);

  return state;
}
