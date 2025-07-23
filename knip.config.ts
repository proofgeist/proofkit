import type { KnipConfig } from "knip";
const config: KnipConfig = {
  ignoreWorkspaces: ["apps/demo"],
  ignore: ["packages/cli/template/**"],
  ignoreBinaries: ["op", "vercel"],
};

export default config;
