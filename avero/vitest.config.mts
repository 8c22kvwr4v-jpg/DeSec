import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globalSetup: ['tests/setup/global.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    // Sikkerhetstestene deler én database; sekvensiell kjoring gir
    // forutsigbare resultater.
    fileParallelism: false,
  },
});
