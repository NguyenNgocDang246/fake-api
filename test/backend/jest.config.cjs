/** @type {import('jest').Config} */
module.exports = {
  rootDir: "../..",
  testEnvironment: "node",
  testMatch: ["<rootDir>/test/backend/**/*.test.ts"],
  clearMocks: true,
  restoreMocks: true,
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  setupFilesAfterEnv: ["<rootDir>/test/backend/jest.setup.ts"],
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: "<rootDir>/test/backend/tsconfig.jest.json",
        diagnostics: false
      },
    ],
    // `@faker-js/faker` ships ESM only, so the CommonJS runtime cannot load its dist as is.
    // Paired with the `transformIgnorePatterns` below, this hands those files to ts-jest too.
    "^.+\\.m?js$": [
      "ts-jest",
      {
        tsconfig: "<rootDir>/test/backend/tsconfig.jest.json",
        diagnostics: false,
        useESM: false,
      },
    ],
  },
  // node_modules is skipped by default; faker is the one package that has to be transformed.
  transformIgnorePatterns: ["/node_modules/(?!@faker-js/)"],
};
