import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/cli/index.ts"],
  format: ["esm"],
  target: "esnext",
  outDir: "dist/cli",
  clean: false,
  splitting: false,
  banner: {
    js: "#!/usr/bin/env node",
  },
});
