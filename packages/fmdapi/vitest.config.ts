import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    testTimeout: 15_000, // 15 seconds, since we're making a network call to FM
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "tests/e2e/**", // E2E tests require live FM server, run separately with test:e2e
    ],
  },
});
