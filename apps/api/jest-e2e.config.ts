import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testEnvironment: 'node',
  testRegex: '.e2e-spec.ts$',
  moduleNameMapper: {
    '^@repo/database/client$': '<rootDir>/../../packages/database/src/generated/client',
    '^@repo/shared/constants$': '<rootDir>/../../packages/shared/src/constants/index.ts',
    '^@repo/shared/utils$': '<rootDir>/../../packages/shared/src/utils/index.ts',
    '^@repo/shared$': '<rootDir>/../../packages/shared/src/index.ts',
  },
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.e2e.json',
      },
    ],
  },
  testTimeout: 30000,
  maxWorkers: 1,
  setupFilesAfterEnv: ['<rootDir>/test/setup/e2e-env.ts'],
  transformIgnorePatterns: ['/node_modules/', '/packages/database/src/generated/client/'],
};

export default config;
