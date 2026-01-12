import { defineConfig } from "vitest/config";
// import dotenv from "dotenv";
// import path from "path";

// // Load .env.local file explicitly
// dotenv.config({ path: path.resolve(__dirname, ".env.local") });

export default defineConfig({
  test: {
    testTimeout: 15_000, // 15 seconds for unit tests
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "tests/e2e/**", // E2E tests require live FM server, run separately with test:e2e
    ],
  },
});
