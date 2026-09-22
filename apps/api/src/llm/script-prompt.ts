import { STYLE_IDS, type StyleId } from '@asf/contracts';

const STYLE_BLURB: Record<StyleId, string> = {
  'noir-neon': 'ночной нуар, мокрый город, жёсткий свет, розовый и бирюзовый неон',
  watercolor: 'акварель: мягкие заливки, текстура бумаги, приглушённые края',
  'comic-90s': 'комикс 90-х: жирная тушь, полутон, плоские насыщенные цвета',
  pixel: 'пиксель-арт: ограниченная палитра, крупные пиксели, читаемый силуэт',
};

export type ScriptPromptInput = {
  idea: string;
  styleId: StyleId;
  /** Текст ошибки прошлой попытки. На первом запросе его нет. */
  correction?: string;
};

export function buildScriptMessages(input: ScriptPromptInput): {
  system: string;
  user: string;
} {
  return {
    system: [
      'Ты раскадровщик короткой визуальной истории из ровно 4 панелей.',
      'Ответь одним JSON-объектом по схеме. Никакого текста вокруг.',
      'caption — на том же языке, что и идея пользователя.',
      'characters[].appearance — по-английски, одна-две фразы: вид, окрас, одежда, одна характерная деталь. Описание самодостаточное, не отсылка к предыдущей сцене.',
      'imagePrompt — по-английски, одна-две фразы: только действие и место. Не повторяй стиль и не описывай внешность персонажа: стиль и паспорт подставятся отдельно.',
      'shotType чередуй между панелями. cameraAngle ставь eye-level, если сцене не нужен другой ракурс.',
      `Допустимые styleId: ${STYLE_IDS.join(', ')}.`,
    ].join('\n'),
    user: [
      `Идея: ${input.idea}`,
      `Стиль (${input.styleId}): ${STYLE_BLURB[input.styleId]}.`,
      input.correction
        ? `Предыдущий ответ отклонён. Исправь указанное и верни полный JSON заново:\n${input.correction}`
        : undefined,
    ]
      .filter((line) => line !== undefined)
      .join('\n'),
  };
}
