import { QUALITIES, STYLE_IDS, type CameraAngle, type Quality, type ShotType, type StyleId } from '@asf/contracts';

export const STYLE_LABELS = {
  'noir-neon': 'Нуар-неон',
  watercolor: 'Акварель',
  'comic-90s': 'Комикс 90-х',
  pixel: 'Пиксель',
} as const satisfies Record<StyleId, string>;

export const QUALITY_LABELS = {
  draft: 'Черновик',
  consistent: 'Цельный',
} as const satisfies Record<Quality, string>;

export const SHOT_LABELS = {
  establishing: 'Общий план места',
  wide: 'Широкий',
  'full-shot': 'В полный рост',
  medium: 'По пояс',
  'close-up': 'Крупный',
  'extreme-close-up': 'Деталь',
  insert: 'Врезка',
} as const satisfies Record<ShotType, string>;

export const ANGLE_LABELS = {
  'eye-level': 'На уровне глаз',
  'low-angle': 'Снизу',
  'high-angle': 'Сверху',
  'birds-eye': 'Отвесно сверху',
  'dutch-angle': 'Заваленный горизонт',
} as const satisfies Record<CameraAngle, string>;

export const styleOptions = STYLE_IDS.map((id) => ({ id, label: STYLE_LABELS[id] }));
export const qualityOptions = QUALITIES.map((id) => ({ id, label: QUALITY_LABELS[id] }));
