import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    testTimeout: 15000,
    // Exclude E2E tests from default test runs
    // When you pass a file path directly (e.g., vitest run tests/e2e.test.ts),
    // vitest will run it regardless of the exclude pattern
    // Run E2E tests with: pnpm test:e2e
    exclude: ["**/node_modules/**", "**/dist/**", "tests/e2e/**"],
    typecheck: {
      enabled: true,
      include: ["src/**/*.ts", "tests/**/*.test.ts", "tests/**/*.test-d.ts"],
      tsconfig: "./tests/tsconfig.json",
    },
  },
});
