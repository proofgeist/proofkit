import { defineConfig, mergeConfig } from "vite";
import { tanstackViteConfig } from "@tanstack/vite-config";

const config = defineConfig({
  plugins: [],
});

export default mergeConfig(
  config,
  tanstackViteConfig({
    entry: ["./src/main.ts", "./src/adapter.ts"],
    externalDeps: ["@proofkit/fmdapi"],
    srcDir: "./src",
  }),
);
