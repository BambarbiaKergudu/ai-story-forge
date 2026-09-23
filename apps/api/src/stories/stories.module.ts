import { Module } from '@nestjs/common';

import { JobsModule } from '../jobs/jobs.module';
import { StoriesController } from './stories.controller';
import { StoriesService } from './stories.service';

@Module({
  imports: [JobsModule],
  controllers: [StoriesController],
  providers: [StoriesService],
})
export class StoriesModule {}
