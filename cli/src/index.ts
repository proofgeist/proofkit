#!/usr/bin/env node
import * as p from "@clack/prompts";
import { Command } from "commander";

import { makeInitCommand, runInit } from "~/cli/init.js";
import { logger } from "~/utils/logger.js";
import { proofGradient, renderTitle } from "~/utils/renderTitle.js";
import { makeAddCommand, runAdd } from "./cli/add/index.js";
import { npmName } from "./consts.js";
import { getVersion } from "./utils/getProofKitVersion.js";
import { parseSettings, type Settings } from "./utils/parseSettings.js";

const main = async () => {
  const program = new Command();
  renderTitle();
  program
    .name(npmName)
    .version(getVersion())
    .command("default", { hidden: true, isDefault: true })
    .action(async () => {
      let settings: Settings | undefined;
      try {
        settings = parseSettings();
      } catch {}

      if (settings) {
        p.intro(
          `Found ${proofGradient("ProofKit")} project, running \`add\`...`
        );
        await runAdd({ settings });
      } else {
        p.intro(
          `No ${proofGradient("ProofKit")} project found, running \`init\``
        );
        await runInit();
      }
    });

  program.addCommand(makeInitCommand());
  program.addCommand(makeAddCommand());

  await program.parseAsync(process.argv);
  process.exit(0);
};

main().catch((err) => {
  logger.error("Aborting installation...");
  if (err instanceof Error) {
    logger.error(err);
  } else {
    logger.error(
      "An unknown error has occurred. Please open an issue on github with the below:"
    );
    console.log(err);
  }
  process.exit(1);
});
