import { Module } from '@nestjs/common';

import { GroqClient } from './groq.client';
import { LlmService } from './llm.service';

@Module({
  providers: [GroqClient, LlmService],
  exports: [LlmService],
})
export class LlmModule {}
