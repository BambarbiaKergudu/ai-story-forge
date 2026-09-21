import { z } from 'zod';

/** Пресеты визуального стиля. Значение уезжает в `Story.styleId`. */
export const STYLE_IDS = ['noir-neon', 'watercolor', 'comic-90s', 'pixel'] as const;

export const styleIdSchema = z.enum(STYLE_IDS);
export type StyleId = z.infer<typeof styleIdSchema>;

/** В Postgres лежит enum `Quality` в верхнем регистре, наружу отдаём нижний. */
export const QUALITIES = ['draft', 'consistent'] as const;

export const qualitySchema = z.enum(QUALITIES);
export type Quality = z.infer<typeof qualitySchema>;

/** Крупность плана: сколько влезает в кадр (ARCHITECTURE §6). */
export const SHOT_TYPES = [
  'establishing', // место действия целиком, персонаж может быть точкой
  'wide', // персонаж в полный рост вместе с окружением
  'full-shot', // фигура от макушки до ног, фон второстепенен
  'medium', // примерно по пояс: жесты и мимика
  'close-up', // лицо
  'extreme-close-up', // глаз, лапа, одна деталь
  'insert', // врезка с предметом: улика, записка, вывеска
] as const;

export const shotTypeSchema = z.enum(SHOT_TYPES);
export type ShotType = z.infer<typeof shotTypeSchema>;

/**
 * Ракурс — ось, независимая от крупности: бывает и крупный план снизу.
 * `eye-level` нейтрален, но дефолта в схеме нет намеренно: строгий structured
 * output требует все поля в `required`, а `.default()` делает поле опциональным.
 * «Бери eye-level, если нет причины для другого» живёт в тексте промпта.
 */
export const CAMERA_ANGLES = [
  'eye-level',
  'low-angle', // снизу вверх: герой крупнее, угроза
  'high-angle', // сверху вниз: герой уязвим
  'birds-eye', // почти отвесно сверху, читается как схема места
  'dutch-angle', // заваленный горизонт, тревога
] as const;

export const cameraAngleSchema = z.enum(CAMERA_ANGLES);
export type CameraAngle = z.infer<typeof cameraAngleSchema>;

/** Длина истории зафиксирована: 4 панели и в промпте, и в БД, и в UI. */
export const PANEL_COUNT = 4;

/**
 * «Паспорт персонажа»: `appearance` дословно подставляется в промпт каждой панели,
 * поэтому описание должно быть самодостаточным, а не отсылкой к предыдущей сцене.
 */
export const characterSchema = z.object({
  name: z.string().min(1).max(60),
  // Верхней границы нет: длинный паспорт не должен ронять всю историю.
  // Краткость просим в промпте, пустую строку отсекает min.
  appearance: z.string().min(20),
});

export type Character = z.infer<typeof characterSchema>;

export const scriptPanelSchema = z.object({
  caption: z.string().min(1),
  imagePrompt: z.string().min(20),
  shotType: shotTypeSchema,
  cameraAngle: cameraAngleSchema,
});

export type ScriptPanel = z.infer<typeof scriptPanelSchema>;

/**
 * Structured output шага `SCRIPT`: из этой же схемы генерируется JSON Schema для
 * запроса к LLM, поэтому здесь нельзя использовать `.transform()` и `.refine()` —
 * они не переводятся в JSON Schema.
 *
 * Порядок панелей задаётся порядком в массиве: `Panel.order` проставляет api при
 * записи в БД, модель номерами не заведует.
 *
 * `imagePrompt` и `appearance` ожидаются на английском и короткими — это просьба
 * в тексте промпта. Схема требует лишь минимум 20 символов: слишком длинный
 * ответ не отбрасывает всю историю.
 */
export const storyScriptSchema = z.object({
  title: z.string().min(1),
  characters: z.array(characterSchema).min(1).max(4),
  panels: z.array(scriptPanelSchema).length(PANEL_COUNT),
});

export type StoryScript = z.infer<typeof storyScriptSchema>;

/** Тело `POST /v1/stories` (ARCHITECTURE §5). */
export const createStoryRequestSchema = z.object({
  idea: z.string().trim().min(10).max(500),
  styleId: styleIdSchema,
  quality: qualitySchema,
  panelCount: z.literal(PANEL_COUNT).default(PANEL_COUNT),
});

export type CreateStoryRequest = z.infer<typeof createStoryRequestSchema>;
