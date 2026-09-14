/** @type {import("prettier").Config} */
const config = {
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 100,
  endOfLine: 'lf',
  plugins: ['prettier-plugin-tailwindcss'],
  tailwindStylesheet: './apps/web/src/app/globals.css',
  overrides: [
    {
      files: ['*.json', '*.md', '*.yaml', '*.yml'],
      options: { singleQuote: false },
    },
  ],
};

export default config;
