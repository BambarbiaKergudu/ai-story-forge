import type { CameraAngle, Character, ShotType, StyleId } from '@asf/contracts';

const STYLE_DESCRIPTION: Record<StyleId, string> = {
  'noir-neon': 'Night noir illustration, wet city, hard light, pink and teal neon, cinematic.',
  watercolor: 'Watercolor illustration, soft washes, paper texture, muted edges.',
  'comic-90s': '1990s comic illustration, heavy ink, halftone, flat saturated colors.',
  pixel: 'Pixel art, limited palette, large pixels, readable silhouette.',
};

const SHOT_LINE: Record<ShotType, string> = {
  establishing: 'wide view of the place, the character is small',
  wide: 'character at full height together with the surroundings',
  'full-shot': 'figure from head to feet, background secondary',
  medium: 'waist-up framing, gestures and expression',
  'close-up': 'the face',
  'extreme-close-up': 'one detail only, such as an eye, a paw, or a small object',
  insert: 'a cutaway of one object',
};

const ANGLE_LINE: Record<CameraAngle, string> = {
  'eye-level': 'camera at eye level',
  'low-angle': 'camera looking up',
  'high-angle': 'camera looking down',
  'birds-eye': 'camera almost straight down',
  'dutch-angle': 'tilted horizon',
};

const REFERENCE_LINE =
  'The attached image is only a character reference from panel 1. Keep the same faces, bodies, and clothes. Do not copy its pose, place, background, or framing. Draw the new Scene and Composition.';

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
    `Composition: ${SHOT_LINE[input.shotType]}. ${ANGLE_LINE[input.cameraAngle]}.`,
    'No text, no speech bubbles, no watermark.',
  ].join(' ');
}

/** Уровень 2: тот же текст плюс указание, что вложенная картинка — референс персонажей. */
export function buildReferencePrompt(input: PanelPromptInput): string {
  return `${REFERENCE_LINE} ${buildPanelPrompt(input)}`;
}
