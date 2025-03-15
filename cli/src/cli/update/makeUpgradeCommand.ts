import { Command } from "commander";

import { ciOption } from "~/globalOptions.js";
import { copyCursorRules } from "~/helpers/copyCursorRules.js";
import { initProgramState, state } from "~/state.js";
import { ensureProofKitProject } from "../utils.js";

export const makeUpgradeCommand = () => {
  const upgradeCommand = new Command("upgrade")
    .description("Upgrade ProofKit components in your project")
    .addOption(ciOption)
    .action(async (args) => {
      initProgramState(args);
      copyCursorRules();
    });

  upgradeCommand.hook("preAction", () => {
    initProgramState(upgradeCommand.opts());
    state.baseCommand = "upgrade";
    ensureProofKitProject({ commandName: "upgrade" });
  });

  return upgradeCommand;
};
