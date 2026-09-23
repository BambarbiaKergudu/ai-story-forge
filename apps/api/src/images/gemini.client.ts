import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from '../env';
import { ImageResponseError } from './image.error';

const GEMINI_MODEL = 'gemini-3.1-flash-image';
const TIMEOUT_MS = 90_000;
const DETAILS_LIMIT = 250;
/** $0.067 за кадр 1K; в `costCents` целое число центов, поэтому округление вверх. */
export const GEMINI_COST_CENTS = 7;

@Injectable()
export class GeminiClient {
  private readonly logger = new Logger(GeminiClient.name);

  constructor(@Inject(ConfigService) private readonly config: ConfigService<Env, true>) {}

  async generate(prompt: string, referencePng?: Buffer): Promise<Buffer> {
    const apiKey = this.config.get('GEMINI_API_KEY', { infer: true });
    if (!apiKey) {
      throw new ImageResponseError(
        'unconfigured',
        'GEMINI_API_KEY is empty. Add a key from https://aistudio.google.com/apikey to .env',
      );
    }

    const parts: unknown[] = [{ text: prompt }];
    if (referencePng) {
      parts.push({
        inline_data: {
          mime_type: 'image/png',
          data: referencePng.toString('base64'),
        },
      });
    }

    const started = Date.now();
    let response: Response;
    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent`,
        {
          method: 'POST',
          headers: {
            'x-goog-api-key': apiKey,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{ role: 'user', parts }],
            generationConfig: {
              responseModalities: ['TEXT', 'IMAGE'],
              responseFormat: {
                image: {
                  aspectRatio: 'ASPECT_RATIO_FOUR_BY_THREE',
                  imageSize: 'IMAGE_SIZE_ONE_K',
                },
              },
            },
          }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        },
      );
    } catch (error) {
      if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
        throw new ImageResponseError('timeout', `gemini request timed out after ${TIMEOUT_MS}ms`);
      }
      const message = error instanceof Error ? error.message : 'network error';
      throw new ImageResponseError('network', message);
    }

    const latencyMs = Date.now() - started;
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      this.logger.warn(`gemini request failed status=${response.status} latencyMs=${latencyMs}`);
      throw new ImageResponseError('http', `gemini responded ${response.status}`, {
        status: response.status,
        details: JSON.stringify(payload).slice(0, DETAILS_LIMIT),
      });
    }

    const bytes = lastImagePart(payload);
    if (!bytes) {
      throw new ImageResponseError('empty', 'gemini returned no image', {
        details: JSON.stringify(payload).slice(0, DETAILS_LIMIT),
      });
    }

    this.logger.log(`gemini image ready latencyMs=${latencyMs}`);
    return Buffer.from(bytes, 'base64');
  }
}

function lastImagePart(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object') {
    return undefined;
  }

  const candidates = 'candidates' in payload ? payload.candidates : undefined;
  const first = Array.isArray(candidates) ? candidates[0] : undefined;
  const content =
    first && typeof first === 'object' && 'content' in first ? first.content : undefined;
  const parts =
    content && typeof content === 'object' && 'parts' in content ? content.parts : undefined;
  if (!Array.isArray(parts)) {
    return undefined;
  }

  let data: string | undefined;
  for (const part of parts) {
    if (!part || typeof part !== 'object' || ('thought' in part && part.thought)) {
      continue;
    }
    const inline =
      'inlineData' in part ? part.inlineData : 'inline_data' in part ? part.inline_data : undefined;
    if (!inline || typeof inline !== 'object' || !('data' in inline) || typeof inline.data !== 'string') {
      continue;
    }
    if (inline.data.length > 0) {
      data = inline.data;
    }
  }

  return data;
}
