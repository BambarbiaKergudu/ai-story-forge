import type {
  AcceptedStory,
  CreateStoryRequest,
  ServiceJwtClaims,
  StoryResponse,
} from '@asf/contracts';
import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { JobEnqueuer } from '../jobs/job-enqueuer';
import { PrismaService } from '../prisma/prisma.service';
import { guestDailyLimit } from './stories.errors';
import { toDbQuality, toStoryResponse } from './story.mapper';

/** Гость: не больше трёх историй за скользящие сутки. */
const GUEST_STORY_LIMIT = 3;
const GUEST_STORY_WINDOW_MS = 24 * 60 * 60 * 1000;

const storyInclude = {
  panels: { orderBy: { order: 'asc' as const } },
} satisfies Prisma.StoryInclude;

/** Гость пишется в `guestKey`. `userId` ссылается на строку, созданную регистрацией. */
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
    @Inject(JobEnqueuer) private readonly jobs: JobEnqueuer,
  ) {}

  async create(input: CreateStoryRequest, actor: ServiceJwtClaims): Promise<AcceptedStory> {
    if (actor.role === 'guest') {
      await this.assertGuestWithinDailyLimit(actor.guestKey);
    }

    const story = await this.prisma.story.create({
      data: {
        idea: input.idea,
        styleId: input.styleId,
        quality: toDbQuality(input.quality),
        status: 'DRAFT_PENDING',
        ...storyOwner(actor),
      },
    });

    try {
      await this.jobs.enqueueScript({ storyId: story.id });
    } catch {
      await this.prisma.story.update({
        where: { id: story.id },
        data: { status: 'FAILED', error: 'could not enqueue script' },
      });
      this.logger.error(`story ${story.id} could not be queued`);
      throw new ServiceUnavailableException('Could not queue the story');
    }

    this.logger.log(`story ${story.id} queued`);
    return { storyId: story.id, status: story.status };
  }

  private async assertGuestWithinDailyLimit(guestKey: string): Promise<void> {
    const since = new Date(Date.now() - GUEST_STORY_WINDOW_MS);
    const used = await this.prisma.story.count({
      where: { guestKey, createdAt: { gte: since } },
    });
    if (used >= GUEST_STORY_LIMIT) {
      throw guestDailyLimit();
    }
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
}
