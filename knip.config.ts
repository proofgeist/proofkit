import type { KnipConfig } from "knip";

const config: KnipConfig = {
  ignore: ["packages/cli/template/**"],
  ignoreBinaries: ["op", "vercel"],
};

export default config;
