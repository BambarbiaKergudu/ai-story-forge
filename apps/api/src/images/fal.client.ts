import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';

import type { Env } from '../env';
import { ImageResponseError } from './image.error';

const FAL_MODEL = 'fal-ai/flux/schnell';
const TIMEOUT_MS = 90_000;
const DOWNLOAD_TIMEOUT_MS = 30_000;
const DETAILS_LIMIT = 250;
/** $0.003 за кадр; в `costCents` целое число центов, поэтому округление вверх. */
export const FAL_COST_CENTS = 1;

const falImageSchema = z.object({
  images: z.array(z.object({ url: z.string().url() })).min(1),
});

@Injectable()
export class FalClient {
  private readonly logger = new Logger(FalClient.name);

  constructor(@Inject(ConfigService) private readonly config: ConfigService<Env, true>) {}

  async generate(prompt: string, seed: number): Promise<Buffer> {
    const apiKey = this.config.get('FAL_KEY', { infer: true });
    if (!apiKey) {
      throw new ImageResponseError(
        'unconfigured',
        'FAL_KEY is empty. Add a key from https://fal.ai/dashboard/keys to .env',
      );
    }

    const started = Date.now();
    const response = await this.post(apiKey, prompt, seed);
    const latencyMs = Date.now() - started;

    if (!response.ok) {
      const body = await response.text();
      this.logger.warn(`fal request failed status=${response.status} latencyMs=${latencyMs}`);
      throw new ImageResponseError('http', `fal responded ${response.status}`, {
        status: response.status,
        details: body.slice(0, DETAILS_LIMIT),
      });
    }

    const payload: unknown = await response.json();
    const parsed = falImageSchema.safeParse(payload);
    if (!parsed.success) {
      throw new ImageResponseError('empty', 'fal returned no image url', {
        details: JSON.stringify(payload).slice(0, DETAILS_LIMIT),
      });
    }

    const imageUrl = parsed.data.images[0]?.url;
    if (!imageUrl) {
      throw new ImageResponseError('empty', 'fal returned no image url');
    }
    let image: Response;
    try {
      image = await fetch(imageUrl, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) });
    } catch (error) {
      throw fromFetchError(error, DOWNLOAD_TIMEOUT_MS);
    }

    if (!image.ok) {
      throw new ImageResponseError('http', `fal image download responded ${image.status}`, {
        status: image.status,
      });
    }

    this.logger.log(`fal image ready latencyMs=${latencyMs}`);
    return Buffer.from(await image.arrayBuffer());
  }

  private async post(apiKey: string, prompt: string, seed: number): Promise<Response> {
    try {
      return await fetch(`https://fal.run/${FAL_MODEL}`, {
        method: 'POST',
        headers: {
          authorization: `Key ${apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          seed,
          image_size: 'landscape_4_3',
          num_images: 1,
          num_inference_steps: 4,
          output_format: 'png',
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      throw fromFetchError(error, TIMEOUT_MS);
    }
  }
}

function fromFetchError(error: unknown, timeoutMs: number): ImageResponseError {
  if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
    return new ImageResponseError('timeout', `fal request timed out after ${timeoutMs}ms`);
  }

  const message = error instanceof Error ? error.message : 'network error';
  return new ImageResponseError('network', message);
}
