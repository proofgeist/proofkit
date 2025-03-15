import path from "path";
import fs from "fs-extra";

import { PKG_ROOT } from "~/consts.js";
import { state } from "~/state.js";

// Copies cursor rules to the project directory
export const copyCursorRules = () => {
  const projectDir = state.projectDir;
  const extrasDir = path.join(PKG_ROOT, "template/extras");
  const cursorRulesSrcDir = path.join(extrasDir, "_cursor/rules");
  const cursorRulesDestDir = path.join(projectDir, ".cursor/rules");

  if (fs.existsSync(cursorRulesSrcDir)) {
    fs.ensureDirSync(cursorRulesDestDir);
    fs.copySync(cursorRulesSrcDir, cursorRulesDestDir);

    // Copy package manager specific rules
    const conditionalRulesDir = path.join(
      extrasDir,
      "_cursor/conditional-rules"
    );
    const packageManagerRules = {
      pnpm: "pnpm.mdc",
      npm: "npm.mdc",
      yarn: "yarn.mdc",
    };

    const selectedRule =
      packageManagerRules[state.pkgManager as keyof typeof packageManagerRules];
    if (selectedRule) {
      const ruleSrc = path.join(conditionalRulesDir, selectedRule);
      const ruleDest = path.join(cursorRulesDestDir, "package-manager.mdc");
      if (fs.existsSync(ruleSrc)) {
        fs.copySync(ruleSrc, ruleDest);
      }
    }
  }
};
