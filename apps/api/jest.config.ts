import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  moduleNameMapper: {
    '^@repo/shared/constants$': '<rootDir>/../../packages/shared/src/constants/index.ts',
    '^@repo/shared/utils$': '<rootDir>/../../packages/shared/src/utils/index.ts',
    '^@repo/shared$': '<rootDir>/../../packages/shared/src/index.ts',
  },
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
};

export default config;
