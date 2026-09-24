import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  // Only pick up files in __tests__ directories
  testMatch: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.test.tsx"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          // Allow Jest to understand modern module syntax
          module: "commonjs",
          esModuleInterop: true,
        },
      },
    ],
  },
  // Don't try to transform node_modules (except none needed here)
  transformIgnorePatterns: ["/node_modules/"],
  // Coverage settings
  collectCoverageFrom: [
    "src/lib/**/*.ts",
    "src/app/api/**/*.ts",
    "!src/**/*.d.ts",
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};

export default config;
