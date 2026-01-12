import chalk from "chalk";

import { DEFAULT_APP_NAME } from "~/consts.js";
import type { InstallerOptions } from "~/installers/index.js";
import { getUserPkgManager } from "~/utils/getUserPkgManager.js";
import { logger } from "~/utils/logger.js";

// This logs the next steps that the user should take in order to advance the project
export const logNextSteps = ({
  projectName = DEFAULT_APP_NAME,
  noInstall,
}: Pick<InstallerOptions, "projectName" | "noInstall">) => {
  const pkgManager = getUserPkgManager();

  logger.info(chalk.bold("Next steps:"));
  logger.dim("\nNavigate to the project directory:");
  projectName !== "." && logger.info(`  cd ${projectName}`);
  logger.dim("(or open in your code editor, and run the rest of these commands from there)");

  if (noInstall) {
    logger.dim("\nInstall dependencies:");
    // To reflect yarn's default behavior of installing packages when no additional args provided
    if (pkgManager === "yarn") {
      logger.info(`  ${pkgManager}`);
    } else {
      logger.info(`  ${pkgManager} install`);
    }
  }

  logger.dim("\nStart the dev server to view your app in a browser:");
  if (["npm", "bun"].includes(pkgManager)) {
    logger.info(`  ${pkgManager} run dev`);
  } else {
    logger.info(`  ${pkgManager} dev`);
  }

  logger.dim("\nOr, run the ProofKit command again to add more to your project:");
  if (["npm", "bun"].includes(pkgManager)) {
    logger.info(`  ${pkgManager} run proofkit`);
  } else {
    logger.info(`  ${pkgManager} proofkit`);
  }
  logger.dim("(Must be inside the project directory)");
};
