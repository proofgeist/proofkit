import { defineConfig } from "vitest/config";
// import dotenv from "dotenv";
// import path from "path";

// // Load .env.local file explicitly
// dotenv.config({ path: path.resolve(__dirname, ".env.local") });

export default defineConfig({
  test: {
    testTimeout: 15_000, // 15 seconds, since we're making a network call to FM
    setupFiles: ["./tests/setupEnv.ts"], // Add setup file
    // Exclude E2E tests from default test runs
    // Run E2E tests with: pnpm test:e2e
    exclude: ["**/node_modules/**", "**/dist/**", "tests/e2e/**"],
  },
});
