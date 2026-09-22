import type { CreateStoryRequest, ServiceJwtClaims, StoryResponse } from '@asf/contracts';
import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { LlmResponseError } from '../llm/llm.error';
import { LlmService } from '../llm/llm.service';
import { PrismaService } from '../prisma/prisma.service';
import { storyGenerationFailed } from './stories.errors';
import { toDbQuality, toStoryResponse } from './story.mapper';

const storyInclude = { panels: { orderBy: { order: 'asc' as const } } } satisfies Prisma.StoryInclude;

/** Гость пишется в `guestKey`. `userId` — внешний ключ на `User`, строку создаёт фаза 3. */
function storyOwner(actor: ServiceJwtClaims): { guestKey: string } | { userId: string } {
  if (actor.role === 'guest') {
    return { guestKey: actor.guestKey };
  }

  return { userId: actor.userId };
}

@Injectable()
export class StoriesService {
  private readonly logger = new Logger(StoriesService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(LlmService) private readonly llm: LlmService,
  ) {}

  async create(input: CreateStoryRequest, actor: ServiceJwtClaims): Promise<StoryResponse> {
    const script = await this.generate(input);

    const story = await this.prisma.story.create({
      data: {
        idea: input.idea,
        title: script.title,
        styleId: input.styleId,
        quality: toDbQuality(input.quality),
        status: 'SCRIPT_READY',
        characters: script.characters,
        ...storyOwner(actor),
        panels: {
          create: script.panels.map((panel, index) => ({
            order: index + 1,
            caption: panel.caption,
            imagePrompt: panel.imagePrompt,
            shotType: panel.shotType,
            cameraAngle: panel.cameraAngle,
            status: 'PENDING',
          })),
        },
      },
      include: storyInclude,
    });

    this.logger.log(`story ${story.id} script ready, panels=${story.panels.length}`);
    return toStoryResponse(story);
  }

  async findOne(id: string): Promise<StoryResponse> {
    const story = await this.prisma.story.findUnique({
      where: { id },
      include: storyInclude,
    });

    if (!story) {
      throw new NotFoundException(`Story ${id} not found`);
    }

    return toStoryResponse(story);
  }

  private async generate(input: CreateStoryRequest) {
    try {
      return await this.llm.generateScript({ idea: input.idea, styleId: input.styleId });
    } catch (error) {
      if (error instanceof LlmResponseError) {
        this.logger.warn(
          `story script failed kind=${error.kind}${error.status ? ` status=${error.status}` : ''}`,
        );
        throw storyGenerationFailed(error);
      }

      throw error;
    }
  }
}
