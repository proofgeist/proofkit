import * as p from "@clack/prompts";
import { Command } from "commander";
import { z } from "zod";

import { addAuth } from "~/generators/auth.js";
import { type Settings } from "~/utils/parseSettings.js";
import { abortIfCancel } from "../utils.js";

interface AddAuthOpts {
  settings: Settings;
  authType?: "clerk" | "proofkit";
}

export async function runAddAuthAction(opts?: AddAuthOpts) {
  const authType =
    opts?.authType ??
    abortIfCancel(
      await p.select({
        message: "What auth provider do you want to use?",
        options: [
          {
            label: "Clerk",
            value: "clerk",
            hint: "Easy to setup and use, may required a paid plan",
          },
          {
            label: "ProofKit Auth",
            value: "proofkit",
            hint: "More advanced, but self-hosted and customizable ",
          },
        ],
      })
    );

  const type = z.enum(["clerk", "proofkit"]).parse(authType);

  await addAuth({ type });
}

export const makeAddAuthCommand = () => {
  const addAuthCommand = new Command("auth")
    .description("Add authentication to your project")
    .option("--authType <authType>", "Type of auth provider to use")

    .action(async (opts: AddAuthOpts) => {
      const settings = opts.settings;
      if (settings.auth.type !== "none") {
        throw new Error("Auth already exists");
      }
      await runAddAuthAction(opts);
    });

  return addAuthCommand;
};
