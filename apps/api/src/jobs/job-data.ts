import { z } from 'zod';

const attemptSchema = z.number().int().min(1).max(99);

export const scriptJobSchema = z.object({
  storyId: z.string().min(1),
  attempt: attemptSchema,
});

export const panelImageJobSchema = z.object({
  storyId: z.string().min(1),
  panelId: z.string().min(1),
  attempt: attemptSchema,
});

export type ScriptJobData = z.infer<typeof scriptJobSchema>;
export type PanelImageJobData = z.infer<typeof panelImageJobSchema>;
