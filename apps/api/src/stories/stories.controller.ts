import {
  createStoryRequestSchema,
  type CreateStoryRequest,
  type ServiceJwtClaims,
  type StoryResponse,
} from '@asf/contracts';
import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Param, Post } from '@nestjs/common';

import { CurrentActor } from '../auth/current-actor';
import { invalidStoryBody } from './stories.errors';
import { StoriesService } from './stories.service';

@Controller('stories')
export class StoriesController {
  constructor(@Inject(StoriesService) private readonly stories: StoriesService) {}

  /** Фаза 1: сценарий собирается в этом запросе. 202 и очередь появятся в фазе 2. */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() body: unknown, @CurrentActor() actor: ServiceJwtClaims): Promise<StoryResponse> {
    return this.stories.create(parseCreateStory(body), actor);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<StoryResponse> {
    return this.stories.findOne(id);
  }
}

function parseCreateStory(body: unknown): CreateStoryRequest {
  const parsed = createStoryRequestSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`)
      .join('; ');
    throw invalidStoryBody(message);
  }

  return parsed.data;
}
