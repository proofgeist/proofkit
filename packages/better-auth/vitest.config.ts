import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    testTimeout: 15_000, // 15 seconds, since we're making a network call to FM
  },
});
