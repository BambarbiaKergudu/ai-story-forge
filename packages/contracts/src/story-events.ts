import { z } from 'zod';

/** Имена SSE-событий из ARCHITECTURE §5. */
export const STORY_SSE_EVENTS = [
  'story.script_ready',
  'panel.generating',
  'panel.ready',
  'panel.failed',
  'story.completed',
] as const;

export const storySseEventSchema = z.enum(STORY_SSE_EVENTS);
export type StorySseEventName = z.infer<typeof storySseEventSchema>;

const panelRefSchema = z.object({
  id: z.string().min(1),
  order: z.number().int().positive(),
  caption: z.string(),
});

export const storyEventSchema = z.discriminatedUnion('event', [
  z.object({
    event: z.literal('story.script_ready'),
    data: z.object({
      title: z.string(),
      panels: z.array(panelRefSchema),
    }),
  }),
  z.object({
    event: z.literal('panel.generating'),
    data: z.object({
      panelId: z.string().min(1),
    }),
  }),
  z.object({
    event: z.literal('panel.ready'),
    data: z.object({
      panelId: z.string().min(1),
      imageUrl: z.string().min(1),
    }),
  }),
  z.object({
    event: z.literal('panel.failed'),
    data: z.object({
      panelId: z.string().min(1),
      error: z.string(),
      retryable: z.boolean(),
    }),
  }),
  z.object({
    event: z.literal('story.completed'),
    data: z.object({
      status: z.enum(['COMPLETED', 'PARTIAL']),
      costCents: z.number().int().nonnegative(),
    }),
  }),
]);

export type StoryEvent = z.infer<typeof storyEventSchema>;
