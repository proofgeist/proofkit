import path from "path";
import { isCancel } from "@clack/core";
import { cancel } from "@clack/prompts";
import chalk from "chalk";
import fs from "fs-extra";
import { ZodError } from "zod";

import { npmName } from "~/consts.js";
import { parseSettings } from "~/utils/parseSettings.js";

/**
 * Runs before any add command is run. Checks if the user is in a ProofKit project and if the
 * proofkit.json file is valid.
 */
export const ensureProofKitProject = ({
  commandName,
}: {
  commandName: string;
}) => {
  const settingsExists = fs.existsSync(
    path.join(process.cwd(), "proofkit.json")
  );
  if (!settingsExists) {
    console.log(
      chalk.yellow(
        `The "${commandName}" command requires an existing ProofKit project.
Please run " ${npmName} init" first, or try this command again when inside a ProofKit project.`
      )
    );
    process.exit(1);
  }

  try {
    return parseSettings();
  } catch (error) {
    console.log(chalk.red("Error parsing ProofKit settings file:"));
    if (error instanceof ZodError) {
      console.log(error.errors);
    } else {
      console.log(error);
    }

    process.exit(1);
  }
};

export class UserAbortedError extends Error {}

export function abortIfCancel(value: string | symbol): string {
  if (isCancel(value)) {
    cancel();
    throw new UserAbortedError();
  }
  return value;
}
