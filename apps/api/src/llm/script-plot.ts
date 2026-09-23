import { STORY_BEATS, type StoryScript } from '@asf/contracts';

/**
 * Схема принимает любой beat из enum. Здесь отсекаем перепутанный порядок
 * и дословно повторённую сцену: такие ответы уходят на повтор с этим текстом.
 */
export function scriptPlotIssues(script: StoryScript): string | undefined {
  const issues: string[] = [];

  script.panels.forEach((panel, index) => {
    const expected = STORY_BEATS[index];
    if (panel.beat !== expected) {
      issues.push(`panels.${index}.beat must be ${expected ?? 'missing'}`);
    }
  });

  const seen = new Map<string, number>();
  script.panels.forEach((panel, index) => {
    const key = panel.imagePrompt.trim().toLowerCase().replace(/\s+/g, ' ');
    const previous = seen.get(key);
    if (previous !== undefined) {
      issues.push(`panels.${index}.imagePrompt repeats panels.${previous}.imagePrompt`);
      return;
    }
    seen.set(key, index);
  });

  return issues.length > 0 ? issues.join('; ') : undefined;
}
