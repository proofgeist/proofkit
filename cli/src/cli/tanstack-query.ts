import * as p from "@clack/prompts";
import { Command } from "commander";

import { injectTanstackQuery } from "~/generators/tanstack-query.js";
import { type Settings } from "~/utils/parseSettings.js";

export const runAddTanstackQueryCommand = async ({
  settings,
}: {
  settings: Settings;
}) => {
  const projectDir = process.cwd();
  const spinner = p.spinner();
  spinner.start("Adding Tanstack Query");
  await injectTanstackQuery({ settings, projectDir });
  spinner.stop("Tanstack Query added");
};

export const makeAddTanstackQueryCommand = () => {
  const addTanstackQueryCommand = new Command("tanstack-query")
    .description("Add Tanstack Query to your project")
    .action(runAddTanstackQueryCommand);

  return addTanstackQueryCommand;
};
