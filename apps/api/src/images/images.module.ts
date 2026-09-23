import { Module } from '@nestjs/common';

import { FalClient } from './fal.client';
import { GeminiClient } from './gemini.client';
import { ImagesService } from './images.service';

@Module({
  providers: [FalClient, GeminiClient, ImagesService],
  exports: [ImagesService],
})
export class ImagesModule {}
