import chalk from "chalk";
import { Effect } from "effect";
import open from "open";
import { confirm, log, select } from "~/cli/prompts.js";

import { DOCS_URL } from "~/consts.js";
import { runDoctor } from "~/core/doctor.js";
import { runPrompt } from "~/core/prompt.js";
import { makeLiveLayer } from "~/services/live.js";
import { checkForAvailableUpgrades, runAllAvailableUpgrades } from "~/upgrades/index.js";
import { resolveNonInteractiveMode } from "~/utils/nonInteractive.js";
import { runDeploy } from "./deploy/index.js";
import { abortIfCancel } from "./utils.js";

function getMenuRuntime() {
  return makeLiveLayer({
    cwd: process.cwd(),
    debug: false,
    nonInteractive: resolveNonInteractiveMode({
      stdinIsTTY: process.stdin?.isTTY,
      stdoutIsTTY: process.stdout?.isTTY,
    }),
  });
}

export const runMenu = async () => {
  const upgrades = checkForAvailableUpgrades();

  if (upgrades.length > 0) {
    log.info(
      `${chalk.yellow("There are upgrades available for your ProofKit project")}\n${upgrades
        .map((upgrade) => `- ${upgrade.title}`)
        .join("\n")}`,
    );

    const shouldRunUpgrades = abortIfCancel(
      await confirm({
        message: "Would you like to run them now?",
        initialValue: true,
      }),
    );

    if (shouldRunUpgrades) {
      await runAllAvailableUpgrades();
      log.success(chalk.green("Successfully ran all upgrades"));
    } else {
      log.info(`You can apply the upgrades later by running ${chalk.cyan("proofkit upgrade")}`);
    }
  }

  const menuChoice = abortIfCancel(
    await select({
      message: "What would you like to do?",
      options: [
        {
          label: "Doctor",
          value: "doctor",
          hint: "Inspect project health and get exact next steps",
        },
        {
          label: "Prompt",
          value: "prompt",
          hint: "Reserved AI-agent workflow entrypoint",
        },
        {
          label: "Deploy",
          value: "deploy",
          hint: "Deploy your app to Vercel",
        },
        {
          label: "View Documentation",
          value: "docs",
          hint: "Open ProofKit documentation",
        },
      ],
    }),
  );

  switch (menuChoice) {
    case "doctor":
      await Effect.runPromise(getMenuRuntime()(runDoctor));
      break;
    case "prompt":
      await Effect.runPromise(getMenuRuntime()(runPrompt));
      break;
    case "docs":
      log.info(`Opening ${chalk.cyan(DOCS_URL)} in your browser...`);
      await open(DOCS_URL);
      break;
    case "deploy":
      await runDeploy();
      break;
    default:
      throw new Error(`Unknown menu choice: ${menuChoice}`);
  }
};
