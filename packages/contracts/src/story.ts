import { z } from 'zod';

import {
  cameraAngleSchema,
  characterSchema,
  qualitySchema,
  shotTypeSchema,
  styleIdSchema,
} from './script';

/** Статусы как в Prisma. Наружу отдаём их же: это состояние машины, не ввод пользователя. */
export const STORY_STATUSES = [
  'DRAFT_PENDING',
  'SCRIPT_READY',
  'RENDERING',
  'COMPLETED',
  'PARTIAL',
  'FAILED',
] as const;

export const storyStatusSchema = z.enum(STORY_STATUSES);
export type StoryStatus = z.infer<typeof storyStatusSchema>;

export const PANEL_STATUSES = ['PENDING', 'GENERATING', 'READY', 'FAILED'] as const;

export const panelStatusSchema = z.enum(PANEL_STATUSES);
export type PanelStatus = z.infer<typeof panelStatusSchema>;

export const storyPanelViewSchema = z.object({
  id: z.string(),
  order: z.number().int().positive(),
  caption: z.string(),
  imagePrompt: z.string(),
  shotType: shotTypeSchema,
  cameraAngle: cameraAngleSchema,
  status: panelStatusSchema,
});

export type StoryPanelView = z.infer<typeof storyPanelViewSchema>;

export const storyViewSchema = z.object({
  id: z.string(),
  idea: z.string(),
  title: z.string().nullable(),
  styleId: styleIdSchema,
  quality: qualitySchema,
  status: storyStatusSchema,
  characters: z.array(characterSchema),
});

export type StoryView = z.infer<typeof storyViewSchema>;

/** Тело `GET /v1/stories/:id`. */
export const storyResponseSchema = z.object({
  story: storyViewSchema,
  panels: z.array(storyPanelViewSchema),
});

export type StoryResponse = z.infer<typeof storyResponseSchema>;

/** Тело `POST /v1/stories`: история принята, сценарий ещё в очереди. */
export const acceptedStorySchema = z.object({
  storyId: z.string().min(1),
  status: storyStatusSchema,
});

export type AcceptedStory = z.infer<typeof acceptedStorySchema>;
