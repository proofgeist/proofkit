import path from "path";
import fs from "fs-extra";

import { type Installer } from "~/installers/index.js";
import { state } from "~/state.js";

export type FMAuthKeys =
  | { username: string; password: string }
  | { ottoApiKey: string };

export const initEnvFile: Installer = () => {
  const envContent = `
# When adding additional environment variables, the schema in "/src/config/env.ts"
# should be updated accordingly.

`
    .trim()
    .concat("\n");

  const envDest = path.join(state.projectDir, ".env");

  fs.writeFileSync(envDest, envContent, "utf-8");
};
