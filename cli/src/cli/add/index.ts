import * as p from "@clack/prompts";
import chalk from "chalk";
import { Command } from "commander";

import { cliName, npmName } from "~/consts.js";
import { ciOption, debugOption } from "~/globalOptions.js";
import { initProgramState } from "~/state.js";
import { getVersion } from "~/utils/getProofKitVersion.js";
import { getUserPkgManager } from "~/utils/getUserPkgManager.js";
import { getSettings } from "~/utils/parseSettings.js";
import { getNpmVersion } from "~/utils/renderVersionWarning.js";
import { runAddTanstackQueryCommand } from "../tanstack-query.js";
import { ensureProofKitProject } from "../utils.js";
import { makeAddAuthCommand, runAddAuthAction } from "./auth.js";
import {
  makeAddDataSourceCommand,
  runAddDataSourceCommand,
} from "./data-source/index.js";
import { makeAddSchemaCommand, runAddSchemaAction } from "./fmschema.js";
import { makeAddPageCommand, runAddPageAction } from "./page/index.js";

export const runAdd = async (name: string | undefined) => {
  const npmVersion = await getNpmVersion();
  const currentVersion = getVersion();
  if (currentVersion !== npmVersion) {
    const pkgManager = getUserPkgManager();
    p.log.warn(
      `${chalk.yellow(
        `You are using an outdated version of ${cliName}.`
      )} Your version: ${currentVersion}. Latest version: ${npmVersion}.
      Run ${chalk.magenta.bold(`${pkgManager} install ${npmName}@latest`)} to get the latest updates.`
    );
  }

  const settings = getSettings();
  if (name === "tanstack-query") {
    return await runAddTanstackQueryCommand({ settings });
  }

  const addType = await p.select({
    message: "What do you want to add to your project?",
    options: [
      { label: "Page", value: "page" },
      {
        label: "Schema",
        value: "schema",
        hint: "load data from a new table or layout from an existing data source",
      },
      {
        label: "Data Source",
        value: "data",
        hint: "to connect to a new database or FileMaker file",
      },
      ...(settings.auth.type === "none"
        ? [{ label: "Auth", value: "auth" }]
        : []),
    ],
  });

  if (addType === "auth") {
    await runAddAuthAction();
  } else if (addType === "data") {
    await runAddDataSourceCommand();
  } else if (addType === "page") {
    await runAddPageAction();
  } else if (addType === "schema") {
    await runAddSchemaAction();
  }
};

export const makeAddCommand = () => {
  const addCommand = new Command("add")
    .description("Add a new component to your project")
    .argument("name", "Type of component to add", undefined)
    .addOption(ciOption)
    .addOption(debugOption)
    .action(runAdd);

  addCommand.hook("preAction", (_thisCommand, _actionCommand) => {
    // console.log("preAction", _actionCommand.opts());
    initProgramState(_actionCommand.opts());
    ensureProofKitProject({ commandName: "add" });
  });
  addCommand.hook("preSubcommand", (_thisCommand, _subCommand) => {
    // console.log("preSubcommand", _subCommand.opts());
    initProgramState(_subCommand.opts());
    ensureProofKitProject({ commandName: "add" });
  });

  addCommand.addCommand(makeAddAuthCommand());
  addCommand.addCommand(makeAddPageCommand());
  addCommand.addCommand(makeAddSchemaCommand());
  addCommand.addCommand(makeAddDataSourceCommand());
  return addCommand;
};
