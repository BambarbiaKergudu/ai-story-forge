import type { Prisma, Quality as DbQuality } from '@prisma/client';
import { storyResponseSchema, type Quality, type StoryResponse } from '@asf/contracts';

const QUALITY_TO_DB = {
  draft: 'DRAFT',
  consistent: 'CONSISTENT',
} as const satisfies Record<Quality, DbQuality>;

const QUALITY_FROM_DB = {
  DRAFT: 'draft',
  CONSISTENT: 'consistent',
} as const satisfies Record<DbQuality, Quality>;

export function toDbQuality(quality: Quality): DbQuality {
  return QUALITY_TO_DB[quality];
}

export function fromDbQuality(quality: DbQuality): Quality {
  return QUALITY_FROM_DB[quality];
}

type StoryWithPanels = Prisma.StoryGetPayload<{ include: { panels: true } }>;

export function toStoryResponse(story: StoryWithPanels): StoryResponse {
  return storyResponseSchema.parse({
    story: {
      id: story.id,
      idea: story.idea,
      title: story.title,
      styleId: story.styleId,
      quality: QUALITY_FROM_DB[story.quality],
      status: story.status,
      characters: story.characters ?? [],
    },
    panels: story.panels.map((panel) => ({
      id: panel.id,
      order: panel.order,
      caption: panel.caption,
      imagePrompt: panel.imagePrompt,
      shotType: panel.shotType,
      cameraAngle: panel.cameraAngle,
      status: panel.status,
      imageUrl: panel.imageUrl,
    })),
  });
}
