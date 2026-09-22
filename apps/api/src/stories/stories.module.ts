import { Module } from '@nestjs/common';

import { LlmModule } from '../llm/llm.module';
import { StoriesController } from './stories.controller';
import { StoriesService } from './stories.service';

@Module({
  imports: [LlmModule],
  controllers: [StoriesController],
  providers: [StoriesService],
})
export class StoriesModule {}
