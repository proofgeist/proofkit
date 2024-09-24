import * as p from "@clack/prompts";
import { Command } from "commander";

import { type Settings } from "~/utils/parseSettings.js";

export const runAddPageAction = async () => {
  const pageName = await p.text({
    message: "What is the name of the page you want to add?",
  });
  console.log("add page");
};

export const makeAddPageCommand = () => {
  const addPageCommand = new Command("page")
    .description("Add a new page to your project")
    .action(async (opts: { settings: Settings }) => {
      const settings = opts.settings;
      await runAddPageAction();
    });

  return addPageCommand;
};
