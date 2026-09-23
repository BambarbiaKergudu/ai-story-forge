/**
 * Спайк консистентности, не часть приложения.
 * Одна история, три способа, 12 картинок в out/index.html.
 *
 * (а) голый промпт, fal FLUX schnell, seed каждый раз свой
 * (б) стиль + паспорт + общий seed, тот же fal
 * (в) Gemini 3.1 Flash Image: панель 1 без референса, панели 2–4 с картинкой панели 1
 *
 * Запуск из корня: node spikes/character-consistency/run.mjs
 * Ключи FAL_KEY и GEMINI_API_KEY — в корневом .env.
 */

import { Buffer } from 'node:buffer';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, 'out');
const rootEnv = resolve(here, '../../.env');

const FAL_MODEL = 'fal-ai/flux/schnell';
const GEMINI_MODEL = 'gemini-3.1-flash-image';
const STORY_SEED = 120419;
const FAL_PRICE = 0.003;
const GEMINI_PRICE = 0.067;

const STYLE =
  'Night noir illustration, wet city, hard light, pink and teal neon, cinematic.';

const CHARACTER =
  'One anthropomorphic black cat detective: short charcoal fur, yellow eyes, worn tan trench coat, silver fish-shaped lapel pin.';

const PANELS = [
  {
    order: 1,
    shotType: 'establishing',
    cameraAngle: 'eye-level',
    scene:
      'The cat stands in the rain at a window, looking at an empty glass fishbowl on the sill of a neon apartment.',
  },
  {
    order: 2,
    shotType: 'insert',
    cameraAngle: 'high-angle',
    scene:
      'Wet neon pavement holds a single gold fish scale and one paw print, with the cat paw at the edge of the frame inspecting them.',
  },
  {
    order: 3,
    shotType: 'medium',
    cameraAngle: 'dutch-angle',
    scene:
      'An underground aquarium speakeasy. Fish patrons sit at the bar while the cat sits at the counter.',
  },
  {
    order: 4,
    shotType: 'wide',
    cameraAngle: 'eye-level',
    scene:
      'A goldfish in a tiny leather jacket rides a scooter down the neon street, and the cat tips his hat.',
  },
];

const METHODS = [
  {
    id: 'bare',
    title: 'Голый промпт · FLUX schnell',
  },
  {
    id: 'passport',
    title: `Паспорт + общий seed ${STORY_SEED} · FLUX schnell`,
  },
  {
    id: 'gemini',
    title: 'Gemini · первая панель как референс',
  },
];

function loadEnv() {
  try {
    process.loadEnvFile(rootEnv);
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
    if (code !== 'ENOENT') {
      throw error;
    }
  }
}

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`В корневом .env нет ${name}. Спайк остановлен до запросов к моделям.`);
  }
  return value;
}

function barePrompt(panel) {
  return panel.scene;
}

function passportPrompt(panel) {
  return [
    `${STYLE} ${CHARACTER}`,
    `Scene: ${panel.scene}`,
    `Composition: ${panel.shotType}, ${panel.cameraAngle}.`,
    'No text, no speech bubbles, no watermark.',
  ].join(' ');
}

async function falImage(apiKey, prompt, seed) {
  const body = {
    prompt,
    image_size: 'landscape_4_3',
    num_images: 1,
    num_inference_steps: 4,
    output_format: 'png',
  };
  if (seed !== undefined) {
    body.seed = seed;
  }

  const response = await globalThis.fetch(`https://fal.run/${FAL_MODEL}`, {
    method: 'POST',
    headers: {
      Authorization: `Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: globalThis.AbortSignal.timeout(120_000),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`fal ${response.status}: ${shortError(payload)}`);
  }
  const url = payload?.images?.[0]?.url;
  if (typeof url !== 'string') {
    throw new Error('fal вернул ответ без images[0].url');
  }
  const image = await globalThis.fetch(url, { signal: globalThis.AbortSignal.timeout(60_000) });
  if (!image.ok) {
    throw new Error(`fal image ${image.status}`);
  }
  return Buffer.from(await image.arrayBuffer());
}

async function geminiImage(apiKey, prompt, reference) {
  const parts = [{ text: prompt }];
  if (reference) {
    parts.push({
      inline_data: {
        mime_type: 'image/png',
        data: reference.toString('base64'),
      },
    });
  }

  const response = await globalThis.fetch(
    `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent`,
    {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
          responseFormat: {
            image: { aspectRatio: 'ASPECT_RATIO_FOUR_BY_THREE', imageSize: 'IMAGE_SIZE_ONE_K' },
          },
        },
      }),
      signal: globalThis.AbortSignal.timeout(180_000),
    },
  );
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`gemini ${response.status}: ${shortError(payload)}`);
  }
  const image = lastImagePart(payload);
  if (!image) {
    throw new Error(`gemini не вернул картинку: ${shortError(payload)}`);
  }
  return Buffer.from(image, 'base64');
}

function lastImagePart(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) {
    return undefined;
  }
  let data;
  for (const part of parts) {
    if (part?.thought) {
      continue;
    }
    const inline = part?.inlineData ?? part?.inline_data;
    const bytes = inline?.data;
    if (typeof bytes === 'string' && bytes.length > 0) {
      data = bytes;
    }
  }
  return data;
}

function shortError(payload) {
  const text = JSON.stringify(payload ?? {});
  return text.length > 800 ? `${text.slice(0, 800)}…` : text;
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function sheet(cells) {
  const rows = METHODS.map((method) => {
    const figures = PANELS.map((panel) => {
      const cell = cells.find((item) => item.method === method.id && item.order === panel.order);
      const media = cell?.file
        ? `<img src="${cell.file}" alt="${escapeHtml(method.title)} панель ${panel.order}">`
        : `<p>${escapeHtml(cell?.error ?? 'нет файла')}</p>`;
      return `<figure>${media}<figcaption>${panel.order}. ${escapeHtml(panel.shotType)}, ${escapeHtml(panel.cameraAngle)}</figcaption></figure>`;
    }).join('');
    return `<section class="row"><h2>${escapeHtml(method.title)}</h2><div class="panels">${figures}</div></section>`;
  }).join('');

  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Спайк консистентности</title>
  <style>
    body { margin: 0; background: #12121a; color: #fff; font-family: system-ui, sans-serif; }
    main { padding: 1.5rem; }
    h1 { font-size: 1.4rem; margin: 0 0 0.5rem; }
    p.note { color: #aaa; margin: 0 0 1.5rem; }
    .row { margin-bottom: 2rem; }
    h2 { font-size: 1rem; margin: 0 0 0.75rem; }
    .panels { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.75rem; }
    figure { margin: 0; min-width: 0; }
    img { width: 100%; height: auto; border-radius: 8px; background: #222; }
    figcaption, figure p { font-size: 0.8rem; color: #bbb; margin: 0.35rem 0 0; }
  </style>
</head>
<body>
  <main>
    <h1>Один кот, три способа</h1>
    <p class="note">Строка — способ. Столбцы — панели 1–4 одной истории. Оценка около $${(FAL_PRICE * 8 + GEMINI_PRICE * 4).toFixed(3)}.</p>
    ${rows}
  </main>
</body>
</html>
`;
}

async function main() {
  loadEnv();
  const falKey = required('FAL_KEY');
  const geminiKey = required('GEMINI_API_KEY');
  await mkdir(outDir, { recursive: true });

  const cells = [];
  let reference;

  for (const panel of PANELS) {
    const bareFile = `bare-${panel.order}.png`;
    if (await savedImage(bareFile)) {
      process.stdout.write(`bare ${panel.order} kept\n`);
      cells.push({ method: 'bare', order: panel.order, file: bareFile });
    } else {
      process.stdout.write(`bare ${panel.order}\n`);
      try {
        const bytes = await falImage(falKey, barePrompt(panel));
        await writeFile(resolve(outDir, bareFile), bytes);
        cells.push({ method: 'bare', order: panel.order, file: bareFile });
      } catch (error) {
        cells.push({ method: 'bare', order: panel.order, error: message(error) });
      }
    }

    const passportFile = `passport-${panel.order}.png`;
    if (await savedImage(passportFile)) {
      process.stdout.write(`passport ${panel.order} kept\n`);
      cells.push({ method: 'passport', order: panel.order, file: passportFile });
    } else {
      process.stdout.write(`passport ${panel.order}\n`);
      try {
        const bytes = await falImage(falKey, passportPrompt(panel), STORY_SEED);
        await writeFile(resolve(outDir, passportFile), bytes);
        cells.push({ method: 'passport', order: panel.order, file: passportFile });
      } catch (error) {
        cells.push({ method: 'passport', order: panel.order, error: message(error) });
      }
    }
  }

  for (const panel of PANELS) {
    const file = `gemini-${panel.order}.png`;
    const prompt = reference
      ? `The attached image is the character reference from panel 1. Keep the same characters and their appearance. ${passportPrompt(panel)}`
      : passportPrompt(panel);
    process.stdout.write(`gemini ${panel.order}\n`);
    try {
      const bytes = await geminiImage(geminiKey, prompt, reference);
      await writeFile(resolve(outDir, file), bytes);
      cells.push({ method: 'gemini', order: panel.order, file });
      if (!reference) {
        reference = bytes;
      }
    } catch (error) {
      cells.push({ method: 'gemini', order: panel.order, error: message(error) });
    }
  }

  const htmlPath = resolve(outDir, 'index.html');
  await writeFile(htmlPath, sheet(cells));
  const failed = cells.filter((cell) => cell.error);
  process.stdout.write(`${htmlPath}\n`);
  if (failed.length > 0) {
    for (const cell of failed) {
      process.stdout.write(`${cell.method} ${cell.order}: ${cell.error}\n`);
    }
    process.exitCode = 1;
  }
}

async function savedImage(name) {
  try {
    const info = await stat(resolve(outDir, name));
    return info.size > 1000;
  } catch {
    return false;
  }
}

function message(error) {
  return error instanceof Error ? error.message : 'неизвестная ошибка';
}

await main();
