import { defineConfig } from "vitest/config";
// import dotenv from "dotenv";
// import path from "path";

// // Load .env.local file explicitly
// dotenv.config({ path: path.resolve(__dirname, ".env.local") });

export default defineConfig({
  test: {
    testTimeout: 15000, // 15 seconds, since we're making a network call to FM
    setupFiles: ["./tests/setupEnv.ts"],
  },
});
