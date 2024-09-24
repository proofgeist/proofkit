import path from "path";
import * as p from "@clack/prompts";
import chalk from "chalk";
import { Command } from "commander";
import fs from "fs-extra";
import { ZodError } from "zod";

import { npmName } from "~/consts.js";
import { parseSettings, type Settings } from "~/utils/parseSettings.js";
import { makeAddAuthCommand, runAddAuthAction } from "./auth.js";
import { makeAddSchemaCommand, runAddSchemaAction } from "./fmschema.js";
import { makeAddPageCommand, runAddPageAction } from "./page.js";

/**
 * Runs before any add command is run. Checks if the user is in a ProofKit project and if the
 * proofkit.json file is valid.
 */
const preAction = () => {
  const settingsExists = fs.existsSync(
    path.join(process.cwd(), "proofkit.json")
  );
  if (!settingsExists) {
    console.log(
      chalk.yellow(
        `The "add" command requires an existing ProofKit project.
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

export const runAdd = async (opts: { settings: Settings }) => {
  const settings = opts.settings;

  const addType = await p.select({
    message: "What do you want to add to your project?",
    options: [
      { label: "Page", value: "page" },
      { label: "Schema", value: "schema" },
      ...(settings.auth.type === "none"
        ? [{ label: "Auth", value: "auth" }]
        : []),
    ],
  });

  if (addType === "auth") {
    await runAddAuthAction();
  }
  if (addType === "page") {
    await runAddPageAction();
  }
  if (addType === "schema") {
    await runAddSchemaAction({ settings });
  }
};

export const makeAddCommand = () => {
  const addCommand = new Command("add")
    .description("Add a new component to your project")
    .action(runAdd);

  addCommand.hook("preAction", (_thisCommand, actionCommand) => {
    const settings = preAction();
    actionCommand.setOptionValue("settings", settings);
  });
  addCommand.hook("preSubcommand", (_thisCommand, actionCommand) => {
    const settings = preAction();
    actionCommand.setOptionValue("settings", settings);
  });

  addCommand.addCommand(makeAddAuthCommand());
  addCommand.addCommand(makeAddPageCommand());
  addCommand.addCommand(makeAddSchemaCommand());
  return addCommand;
};
