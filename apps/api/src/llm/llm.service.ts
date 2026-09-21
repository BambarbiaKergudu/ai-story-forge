import type { StoryScript, StyleId } from '@asf/contracts';
import { Inject, Injectable } from '@nestjs/common';

import { GroqClient } from './groq.client';
import { buildScriptMessages } from './script-prompt';

export type GenerateScriptInput = {
  idea: string;
  styleId: StyleId;
};

/**
 * Единственная точка входа текстового шага. Снаружи нет Groq:
 * смена провайдера остаётся внутри этого модуля.
 */
@Injectable()
export class LlmService {
  constructor(@Inject(GroqClient) private readonly groq: GroqClient) {}

  generateScript(input: GenerateScriptInput): Promise<StoryScript> {
    return this.groq.completeScript(buildScriptMessages(input));
  }
}
