import { defineConfig } from "tsdown";

const isDev = process.env.npm_lifecycle_event === "dev";

export default defineConfig({
  clean: true,
  entry: ["src/index.ts"],
  format: ["esm"],
  minify: !isDev,
  target: "esnext",
  outDir: "dist",
  // Bundle workspace dependencies that shouldn't be external
  noExternal: ["@proofkit/registry"],
  onSuccess: isDev ? "IS_LOCAL_DEV=1 node dist/index.js" : undefined,
});
