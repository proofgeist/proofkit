import path from "path";
import fs from "fs-extra";

import { _initialConfig as eslintConfig } from "~/../template/extras/config/_eslint.js";
import { type Installer } from "~/installers/index.js";
import { state } from "~/state.js";

export const dynamicEslintInstaller: Installer = () => {
  // Convert config from _eslint.config.json to .eslintrc.cjs
  const eslintrcFileContents = [
    '/** @type {import("eslint").Linter.Config} */',
    `const config = ${JSON.stringify(eslintConfig, null, 2)}`,
    "module.exports = config;",
  ].join("\n");

  const eslintConfigDest = path.join(state.projectDir, ".eslintrc.cjs");
  fs.writeFileSync(eslintConfigDest, eslintrcFileContents, "utf-8");
};
