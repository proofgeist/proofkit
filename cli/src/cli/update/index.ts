import chalk from "chalk";
import { Command } from "commander";

import { copyCursorRules } from "~/helpers/copyCursorRules.js";
import { logger } from "~/utils/logger.js";

export const upgrade = new Command()
  .name("upgrade")
  .description("Upgrade ProofKit components in your project")
  .action(async () => {
    try {
      logger.info(`\nUpgrading cursor rules...\n`);
      copyCursorRules();
      logger.info(chalk.green(`✔ Successfully upgraded cursor rules\n`));
    } catch (error) {
      logger.error("Failed to upgrade components:", error);
      process.exit(1);
    }
  });
