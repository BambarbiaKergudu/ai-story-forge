import type { StoryScript, StyleId } from '@asf/contracts';
import { Inject, Injectable, Logger } from '@nestjs/common';

import { GroqClient } from './groq.client';
import { LlmResponseError } from './llm.error';
import { scriptPlotIssues } from './script-plot';
import { SCRIPT_ATTEMPTS, scriptRetryCorrection } from './script-retry';
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
  private readonly logger = new Logger(LlmService.name);

  constructor(@Inject(GroqClient) private readonly groq: GroqClient) {}

  async generateScript(input: GenerateScriptInput): Promise<StoryScript> {
    let correction: string | undefined;

    for (let attempt = 1; attempt <= SCRIPT_ATTEMPTS; attempt++) {
      try {
        const script = await this.groq.completeScript(
          buildScriptMessages({ ...input, correction }),
        );
        const plot = scriptPlotIssues(script);
        if (plot !== undefined) {
          throw new LlmResponseError('schema', 'script plot is not four distinct beats', {
            details: plot,
          });
        }
        return script;
      } catch (error) {
        if (!(error instanceof LlmResponseError)) {
          throw error;
        }

        const nextCorrection = scriptRetryCorrection(error, attempt);
        if (nextCorrection === undefined) {
          throw error;
        }

        correction = nextCorrection;
        this.logger.warn(
          `script attempt ${attempt} failed kind=${error.kind}, retrying with: ${correction}`,
        );
      }
    }

    throw new LlmResponseError('schema', 'script retries exhausted');
  }
}
