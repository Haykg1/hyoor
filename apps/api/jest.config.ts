import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
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
        tsconfig: {
          baseUrl: '.',
          module: 'commonjs',
          moduleResolution: 'node',
          paths: {
            '@repo/database/client': ['../../packages/database/src/generated/client'],
          },
        },
      },
    ],
  },
  transformIgnorePatterns: ['/node_modules/', '/packages/database/src/generated/client/'],
};

export default config;
