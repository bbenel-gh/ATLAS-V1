/**
 * CLAUDE.md: "Jest for everything in src/domain" and "Write the tests in
 * src/domain first, then the code."
 *
 * Tests live next to the code they cover, as *.test.ts under src/ and scripts/.
 */
module.exports = {
  preset: 'jest-expo',
  roots: ['<rootDir>/src', '<rootDir>/scripts'],
  clearMocks: true,
  collectCoverageFrom: ['src/domain/**/*.ts', '!src/**/*.test.ts'],
};
