module.exports = {
  extends: ['@repo/eslint-config/nest'],
  parserOptions: {
    project: ['./tsconfig.json', './tsconfig.e2e.json'],
    tsconfigRootDir: __dirname,
  },
};
