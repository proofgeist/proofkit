import { defineConfig, mergeConfig } from "vite";
import { tanstackViteConfig } from "@tanstack/vite-config";

const config = defineConfig({
  plugins: [],
});

export default mergeConfig(
  config,
  tanstackViteConfig({
    entry: [
      "./src/index.ts",
      "./src/cli.ts",
      "./src/types.ts",
      "./src/server/contract.ts",
    ],
    srcDir: "./src",
    cjs: false,
    outDir: "./dist",
  }),
);
