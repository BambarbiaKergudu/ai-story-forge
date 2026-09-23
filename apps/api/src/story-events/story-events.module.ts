import { Module } from '@nestjs/common';

import { StoryEventsService } from './story-events.service';

@Module({
  providers: [StoryEventsService],
  exports: [StoryEventsService],
})
export class StoryEventsModule {}
