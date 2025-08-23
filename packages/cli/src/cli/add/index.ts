import * as p from "@clack/prompts";
import { Command } from "commander";

import { ciOption, debugOption } from "~/globalOptions.js";
import { initProgramState, state } from "~/state.js";
import { getSettings } from "~/utils/parseSettings.js";
import {
  makeAddReactEmailCommand,
  runAddReactEmailCommand,
} from "../react-email.js";
import { runAddTanstackQueryCommand } from "../tanstack-query.js";
import { abortIfCancel, ensureProofKitProject } from "../utils.js";
import { makeAddAuthCommand, runAddAuthAction } from "./auth.js";
import {
  makeAddDataSourceCommand,
  runAddDataSourceCommand,
} from "./data-source/index.js";
import { makeAddSchemaCommand, runAddSchemaAction } from "./fmschema.js";
import { makeAddPageCommand, runAddPageAction } from "./page/index.js";
import { installFromRegistry } from "./registry/install.js";

export const runAdd = async (
  name: string | undefined,
  options?: { noInstall?: boolean }
) => {
  if (name === "tanstack-query") {
    return await runAddTanstackQueryCommand();
  } else if (name !== undefined) {
    // an arbitrary name was provided, so we'll try to install from the registry
    return await installFromRegistry(name);
  }

  ensureProofKitProject({ commandName: "add" });
  const settings = getSettings();

  const addType = abortIfCancel(
    await p.select({
      message: "What do you want to add to your project?",
      options: [
        { label: "Page", value: "page" },
        {
          label: "Schema",
          value: "schema",
          hint: "load data from a new table or layout from an existing data source",
        },
        { label: "React Email", value: "react-email" },
        ...(settings.appType === "browser"
          ? [
              {
                label: "Data Source",
                value: "data",
                hint: "to connect to a new database or FileMaker file",
              },
            ]
          : []),
        ...(settings.auth.type === "none" && settings.appType === "browser"
          ? [{ label: "Auth", value: "auth" }]
          : []),
      ],
    })
  );

  // For shadcn projects, block adding new pages or auth for now
  if (settings.ui === "shadcn") {
    if (addType === "page" || addType === "auth") {
      return p.cancel(
        "Adding new pages or auth is not yet supported for shadcn-based projects."
      );
    }
  }

  if (addType === "auth") {
    await runAddAuthAction();
  } else if (addType === "data") {
    await runAddDataSourceCommand();
  } else if (addType === "page") {
    await runAddPageAction();
  } else if (addType === "schema") {
    await runAddSchemaAction();
  } else if (addType === "react-email") {
    await runAddReactEmailCommand({ noInstall: options?.noInstall });
  }
};

export const makeAddCommand = () => {
  const addCommand = new Command("add")
    .description("Add a new component to your project")
    .argument("[name]", "Type of component to add")
    .addOption(ciOption)
    .addOption(debugOption)
    .option(
      "--noInstall",
      "Do not run your package manager install command",
      false
    )
    .action(runAdd as any);

  addCommand.hook("preAction", (_thisCommand, _actionCommand) => {
    // console.log("preAction", _actionCommand.opts());
    initProgramState(_actionCommand.opts());
    state.baseCommand = "add";
  });
  addCommand.hook("preSubcommand", (_thisCommand, _subCommand) => {
    // console.log("preSubcommand", _subCommand.opts());
    initProgramState(_subCommand.opts());
    state.baseCommand = "add";
  });

  addCommand.addCommand(makeAddAuthCommand());
  addCommand.addCommand(makeAddPageCommand());
  addCommand.addCommand(makeAddSchemaCommand());
  addCommand.addCommand(makeAddDataSourceCommand());
  return addCommand;
};
