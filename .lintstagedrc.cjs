const path = require('path');

const WEB_DIR = path.resolve(__dirname, 'apps/web');
const API_DIR = path.resolve(__dirname, 'apps/api');

const toRelative = (root, filenames) =>
  filenames.map((f) => path.relative(root, f).split(path.sep).join('/'));

const buildWebLintCommand = (filenames) => {
  const files = toRelative(WEB_DIR, filenames);
  if (files.length === 0) return [];
  const fileFlags = files.map((f) => `--file ${f}`).join(' ');
  return [`pnpm --filter web exec next lint --fix ${fileFlags}`];
};

const buildApiLintCommand = (filenames) => {
  const files = toRelative(API_DIR, filenames);
  if (files.length === 0) return [];
  return [`pnpm --filter api exec eslint --fix ${files.join(' ')}`];
};

module.exports = {
  'apps/web/**/*.{ts,tsx}': (filenames) => [
    ...buildWebLintCommand(filenames),
    `prettier --write ${filenames.join(' ')}`,
  ],
  'apps/api/**/*.ts': (filenames) => [
    ...buildApiLintCommand(filenames),
    `prettier --write ${filenames.join(' ')}`,
  ],
  'packages/database/**/*.{prisma,ts}': (filenames) => [
    `prettier --write ${filenames.join(' ')}`,
  ],
  'packages/**/*.{ts,tsx,js}': (filenames) => [
    `prettier --write ${filenames.join(' ')}`,
  ],
  '**/*.{json,md,yml,yaml}': (filenames) => [
    `prettier --write ${filenames.join(' ')}`,
  ],
};
