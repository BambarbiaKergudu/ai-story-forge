import { defineConfig } from 'tsup';

export default defineConfig((options) => ({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  treeshake: true,
  // В watch-режиме dist не чистим: turbo уже собрал пакет до старта приложений,
  // а очистка на лету создаёт окно, в котором api/web не находят типы.
  clean: !options.watch,
  // zod остаётся внешней зависимостью: приложения импортируют её напрямую,
  // и две копии в бандле ломали бы instanceof-проверки схем.
  external: ['zod'],
}));
