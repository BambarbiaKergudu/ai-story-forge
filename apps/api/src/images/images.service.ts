import type { CameraAngle, Character, Quality, ShotType, StyleId } from '@asf/contracts';
import { Inject, Injectable } from '@nestjs/common';

import { buildPanelPrompt, buildReferencePrompt } from './image-prompt';
import { ImageResponseError } from './image.error';
import { FAL_COST_CENTS, FalClient } from './fal.client';
import { GEMINI_COST_CENTS, GeminiClient } from './gemini.client';

export type GeneratePanelImageInput = {
  quality: Quality;
  styleId: StyleId;
  characters: Character[];
  scene: string;
  shotType: ShotType;
  cameraAngle: CameraAngle;
  /** Общий seed истории. Черновик передаёт его в FLUX, Gemini seed не принимает. */
  seed: number;
  /** PNG первой панели. Только цельный режим, панели 2–4. */
  referencePng?: Buffer;
};

export type GeneratedPanelImage = {
  provider: 'fal' | 'gemini';
  bytes: Buffer;
  mimeType: 'image/png';
  costCents: number;
};

/**
 * Единственная точка входа картинки. Снаружи нет fal и Gemini:
 * режим `draft` — FLUX с паспортом и общим seed, `consistent` — Gemini с референсом.
 */
@Injectable()
export class ImagesService {
  constructor(
    @Inject(FalClient) private readonly fal: FalClient,
    @Inject(GeminiClient) private readonly gemini: GeminiClient,
  ) {}

  async generate(input: GeneratePanelImageInput): Promise<GeneratedPanelImage> {
    if (input.quality === 'draft') {
      if (!Number.isInteger(input.seed)) {
        throw new ImageResponseError('invalid', 'draft image requires an integer story seed');
      }

      const bytes = await this.fal.generate(buildPanelPrompt(input), input.seed);
      return { provider: 'fal', bytes, mimeType: 'image/png', costCents: FAL_COST_CENTS };
    }

    const prompt = input.referencePng ? buildReferencePrompt(input) : buildPanelPrompt(input);
    const bytes = await this.gemini.generate(prompt, input.referencePng);
    return { provider: 'gemini', bytes, mimeType: 'image/png', costCents: GEMINI_COST_CENTS };
  }
}
