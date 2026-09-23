import { Module } from '@nestjs/common';

import { ImagesModule } from '../images/images.module';
import { LlmModule } from '../llm/llm.module';
import { StorageModule } from '../storage/storage.module';
import { StoryEventsModule } from '../story-events/story-events.module';
import { JobEnqueuer } from './job-enqueuer';
import { JobRunner } from './job-runner';
import { JobsService } from './jobs.service';
import { PanelImageJob } from './panel-image.job';
import { ScriptJob } from './script.job';

@Module({
  imports: [LlmModule, ImagesModule, StorageModule, StoryEventsModule],
  providers: [JobEnqueuer, JobRunner, ScriptJob, PanelImageJob, JobsService],
  exports: [JobEnqueuer],
})
export class JobsModule {}
