import * as p from "@clack/prompts";
import { Command } from "commander";

import { type Settings } from "~/utils/parseSettings.js";
import { ensureProofKitProject } from "../utils.js";
import { makeAddAuthCommand, runAddAuthAction } from "./auth.js";
import {
  makeAddDataSourceCommand,
  runAddDataSourceCommand,
} from "./data-source/index.js";
import { makeAddSchemaCommand, runAddSchemaAction } from "./fmschema.js";
import { makeAddPageCommand, runAddPageAction } from "./page/index.js";

export const runAdd = async (opts: { settings: Settings }) => {
  const settings = opts.settings;

  const addType = await p.select({
    message: "What do you want to add to your project?",
    options: [
      { label: "Page", value: "page" },
      { label: "Schema", value: "schema" },
      { label: "Data Source", value: "data" },
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
  return addCommand;
};
