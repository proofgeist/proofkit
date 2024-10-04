import * as p from "@clack/prompts";
import { Command } from "commander";
import { z } from "zod";

import { ensureProofKitProject } from "~/cli/utils.js";
import { type Settings } from "~/utils/parseSettings.js";
import { promptForFileMakerDataSource } from "./filemaker.js";

const dataSourceType = z.enum(["fm", "supabase"]);
export const runAddDataSourceCommand = async ({
  settings,
}: {
  settings: Settings;
}) => {
  const dataSource = dataSourceType.parse(
    await p.select({
      message: "Which data souce do you want to add?",
      options: [
        { label: "FileMaker", value: "fm" },
        { label: "Supabase", value: "supabase" },
      ],
    })
  );

  if (dataSource === "supabase") {
    throw new Error("Not implemented");
  } else if (dataSource === "fm") {
    await promptForFileMakerDataSource({ projectDir: process.cwd() });
  } else {
    throw new Error("Invalid data source");
  }
};

export const makeAddDataSourceCommand = () => {
  const addDataSourceCommand = new Command("data");
  addDataSourceCommand.description("Add a new data source to your project");

  addDataSourceCommand.hook("preAction", (_thisCommand, actionCommand) => {
    const settings = ensureProofKitProject({ commandName: "add" });
    actionCommand.setOptionValue("settings", settings);
  });

  // addDataSourceCommand.action();
  return addDataSourceCommand;
};
