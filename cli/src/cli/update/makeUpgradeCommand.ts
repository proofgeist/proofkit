import chalk from "chalk";
import { Command } from "commander";
import ora from "ora";

import { ciOption } from "~/globalOptions.js";
import { copyCursorRules } from "~/helpers/copyCursorRules.js";
import { initProgramState, state } from "~/state.js";
import { logger } from "~/utils/logger.js";
import { ensureProofKitProject } from "../utils.js";

export const makeUpgradeCommand = () => {
  const upgradeCommand = new Command("upgrade")
    .description("Upgrade ProofKit components in your project")
    .addOption(ciOption)
    .action(async (args) => {
      initProgramState(args);

      logger.info("\nUpgrading ProofKit components...\n");

      const spinner = ora("Updating cursor rules...").start();
      try {
        copyCursorRules();
        spinner.succeed(chalk.green("Successfully updated cursor rules"));
      } catch (error) {
        spinner.fail(chalk.red("Failed to update cursor rules"));
        logger.error("Error:", error);
        process.exit(1);
      }

      logger.info("\nUpgrade completed successfully!\n");
    });

  upgradeCommand.hook("preAction", (_thisCommand, _actionCommand) => {
    initProgramState(_actionCommand.opts());
    state.baseCommand = "upgrade";
    ensureProofKitProject({ commandName: "upgrade" });
  });

  return upgradeCommand;
};
