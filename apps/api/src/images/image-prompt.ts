import type { CameraAngle, Character, ShotType, StyleId } from '@asf/contracts';

const STYLE_DESCRIPTION: Record<StyleId, string> = {
  'noir-neon': 'Night noir illustration, wet city, hard light, pink and teal neon, cinematic.',
  watercolor: 'Watercolor illustration, soft washes, paper texture, muted edges.',
  'comic-90s': '1990s comic illustration, heavy ink, halftone, flat saturated colors.',
  pixel: 'Pixel art, limited palette, large pixels, readable silhouette.',
};

const REFERENCE_LINE =
  'The attached image is the character reference from panel 1. Keep the same characters and their appearance.';

export type PanelPromptInput = {
  styleId: StyleId;
  characters: Character[];
  scene: string;
  shotType: ShotType;
  cameraAngle: CameraAngle;
};

/** Уровень 1: стиль, паспорт, сцена, крупность и ракурс. Голый промпт сюда не входит. */
export function buildPanelPrompt(input: PanelPromptInput): string {
  const characterSheet = input.characters.map((character) => character.appearance).join(' ');

  return [
    `${STYLE_DESCRIPTION[input.styleId]} ${characterSheet}`,
    `Scene: ${input.scene}`,
    `Composition: ${input.shotType}, ${input.cameraAngle}.`,
    'No text, no speech bubbles, no watermark.',
  ].join(' ');
}

/** Уровень 2: тот же текст плюс указание, что вложенная картинка — референс персонажей. */
export function buildReferencePrompt(input: PanelPromptInput): string {
  return `${REFERENCE_LINE} ${buildPanelPrompt(input)}`;
}
