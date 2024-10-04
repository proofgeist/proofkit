import { Command } from "commander";

import { runCodegenCommand } from "~/generators/fmdapi.js";
import { type Settings } from "~/utils/parseSettings.js";
import { ensureProofKitProject } from "../utils.js";

async function runTypegen(opts: { settings: Settings }) {
  const dataSources = opts.settings.dataSources;
  for await (const db of dataSources) {
    if (db.type === "supabase") {
      throw new Error("Supabase is not supported yet");
    } else if (db.type === "fm") {
      console.log("Detected FileMaker database, generating types...");
      await generateFmTypes({ dbSettings: db });
    } else {
      throw new Error("Unable to generate types for unknown database type");
    }
  }
}

export const makeTypegenCommand = () => {
  const typegenCommand = new Command("typegen")
    .description("Generate types for your project")
    .action(runTypegen);

  typegenCommand.hook("preAction", (_thisCommand, actionCommand) => {
    const settings = ensureProofKitProject({ commandName: "typegen" });
    actionCommand.setOptionValue("settings", settings);
  });

  return typegenCommand;
};

async function generateFmTypes(_opts: {
  dbSettings: Extract<Settings["dataSources"][number], { type: "fm" }>;
}) {
  await runCodegenCommand({ projectDir: process.cwd() });
}
