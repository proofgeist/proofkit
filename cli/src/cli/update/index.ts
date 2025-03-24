import chalk from "chalk";
import { Command } from "commander";

import { copyCursorRules } from "~/helpers/copyCursorRules.js";
import { initProgramState, state } from "~/state.js";
import { logger } from "~/utils/logger.js";
import { ensureProofKitProject } from "../utils.js";

export const runUpgrade = async () => {
  initProgramState({});
  state.baseCommand = "upgrade";
  ensureProofKitProject({ commandName: "upgrade" });

  logger.info("\nUpgrading ProofKit components...\n");

  try {
    logger.info(`\nUpgrading cursor rules...\n`);
    copyCursorRules();
    logger.info(chalk.green(`✔ Successfully upgraded cursor rules\n`));
  } catch (error) {
    logger.error("Failed to upgrade components:", error);
    process.exit(1);
  }
};

export const upgrade = new Command()
  .name("upgrade")
  .description("Upgrade ProofKit components in your project")
  .action(runUpgrade);
