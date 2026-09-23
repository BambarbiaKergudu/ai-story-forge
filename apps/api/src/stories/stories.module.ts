import { Module } from '@nestjs/common';

import { JobsModule } from '../jobs/jobs.module';
import { StoryEventsModule } from '../story-events/story-events.module';
import { StoriesController } from './stories.controller';
import { StoriesService } from './stories.service';

@Module({
  imports: [JobsModule, StoryEventsModule],
  controllers: [StoriesController],
  providers: [StoriesService],
})
export class StoriesModule {}
