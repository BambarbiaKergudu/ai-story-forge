import {
  createStoryRequestSchema,
  type AcceptedStory,
  type CreateStoryRequest,
  type ServiceJwtClaims,
  type StoryEvent,
  type StoryResponse,
} from '@asf/contracts';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Res,
} from '@nestjs/common';

import { CurrentActor } from '../auth/current-actor';
import { StoryEventsService } from '../story-events/story-events.service';
import { invalidStoryBody } from './stories.errors';
import { StoriesService } from './stories.service';

/** Прокси рвут тихий поток. Комментарий SSE не является событием. */
const HEARTBEAT_MS = 15_000;

@Controller('stories')
export class StoriesController {
  constructor(
    @Inject(StoriesService) private readonly stories: StoriesService,
    @Inject(StoryEventsService) private readonly storyEvents: StoryEventsService,
  ) {}

  /** История создаётся в DRAFT_PENDING, сценарий собирает очередь. */
  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  create(@Body() body: unknown, @CurrentActor() actor: ServiceJwtClaims): Promise<AcceptedStory> {
    return this.stories.create(parseCreateStory(body), actor);
  }

  @Get(':id/events')
  async events(@Param('id') id: string, @Res() res: SseStream): Promise<void> {
    await this.stories.findOne(id);
    res.status(HttpStatus.OK);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    writeHeartbeat(res);

    const unsubscribe = this.storyEvents.subscribe(id, (event) => {
      if (!res.writableEnded) {
        writeEvent(res, event);
      }
    });
    const heartbeat = setInterval(() => {
      if (!res.writableEnded) {
        writeHeartbeat(res);
      }
    }, HEARTBEAT_MS);

    res.on('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<StoryResponse> {
    return this.stories.findOne(id);
  }
}

type SseStream = {
  status(code: number): void;
  setHeader(name: string, value: string): void;
  flushHeaders(): void;
  write(chunk: string): void;
  writableEnded: boolean;
  on(event: 'close', listener: () => void): void;
};

function writeEvent(res: SseStream, event: StoryEvent): void {
  res.write(`event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`);
}

function writeHeartbeat(res: SseStream): void {
  res.write(': heartbeat\n\n');
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
