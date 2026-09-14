import js from '@eslint/js';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier/flat';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

/**
 * Единый ESLint-конфиг монорепо. ESLint 9 ищет eslint.config.* от текущей
 * директории вверх по дереву, поэтому `eslint .` внутри любого пакета подхватывает
 * этот файл. Паттерны `files` считаются относительно корня, где лежит конфиг.
 *
 * Держимся на ESLint 9: eslint-plugin-react (зависимость eslint-config-next)
 * пока поддерживает только `eslint ^9.7` и падает на 10.x.
 */
export default defineConfig([
  globalIgnores([
    '**/node_modules/**',
    '**/dist/**',
    '**/.next/**',
    '**/.turbo/**',
    '**/next-env.d.ts',
  ]),

  // База для любого JS/TS в репозитории, включая конфиги в корне.
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx,mts,cts}'],
    extends: [js.configs.recommended],
  },
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    extends: [tseslint.configs.recommended],
    rules: {
      // Импорты типов помечаем явно — это упрощает жизнь бандлерам и isolatedModules.
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  // Next.js: React, hooks, a11y, Core Web Vitals. Только для apps/web.
  {
    files: ['apps/web/**/*.{js,mjs,ts,tsx}'],
    extends: [nextVitals, nextTs],
    settings: {
      // Плагин Next должен знать, где лежит приложение, когда линт запущен из корня.
      next: { rootDir: 'apps/web/' },
    },
    rules: {
      // Правило ищет каталог pages/ — у нас только App Router.
      '@next/next/no-html-link-for-pages': 'off',
    },
  },

  // Всегда последним: отключает стилистические правила, конфликтующие с Prettier.
  prettier,
]);
