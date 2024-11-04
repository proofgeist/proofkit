import * as p from "@clack/prompts";
import chalk from "chalk";
import { Command } from "commander";

import { cliName, npmName } from "~/consts.js";
import { getVersion } from "~/utils/getProofKitVersion.js";
import { getUserPkgManager } from "~/utils/getUserPkgManager.js";
import { type Settings } from "~/utils/parseSettings.js";
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

export const runAdd = async (
  name: string | undefined,
  opts: { settings: Settings }
) => {
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

  const settings = opts.settings;

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
    await runAddDataSourceCommand({ settings });
  } else if (addType === "page") {
    await runAddPageAction({ settings });
  } else if (addType === "schema") {
    await runAddSchemaAction({ settings });
  }
};

export const makeAddCommand = () => {
  const addCommand = new Command("add")
    .description("Add a new component to your project")
    .argument("name", "Type of component to add", undefined)
    .action(runAdd);

  addCommand.hook("preAction", (_thisCommand, actionCommand) => {
    const settings = ensureProofKitProject({ commandName: "add" });
    actionCommand.setOptionValue("settings", settings);
  });
  addCommand.hook("preSubcommand", (_thisCommand, actionCommand) => {
    const settings = ensureProofKitProject({ commandName: "add" });
    actionCommand.setOptionValue("settings", settings);
  });

  addCommand.addCommand(makeAddAuthCommand());
  addCommand.addCommand(makeAddPageCommand());
  addCommand.addCommand(makeAddSchemaCommand());
  addCommand.addCommand(makeAddDataSourceCommand());
  // addCommand.addCommand(makeAddTanstackQueryCommand());
  return addCommand;
};
