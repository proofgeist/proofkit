import * as p from "@clack/prompts";
import { Command } from "commander";
import { z } from "zod";

import { addAuth } from "~/generators/auth.js";
import { type Settings } from "~/utils/parseSettings.js";
import { abortIfCancel } from "../utils.js";

interface AddAuthOpts {
  settings: Settings;
  authType?: "clerk" | "next-auth";
}

export async function runAddAuthAction(opts?: AddAuthOpts) {
  const authType =
    opts?.authType ??
    abortIfCancel(
      await p.select({
        message: "What auth provider do you want to use?",
        options: [
          { label: "Clerk", value: "clerk" },
          { label: "NextAuth", value: "next-auth" },
        ],
      })
    );

  const type = z.enum(["clerk", "next-auth"]).parse(authType);

  await addAuth({ type });
}

export const makeAddAuthCommand = () => {
  const addAuthCommand = new Command("auth")
    .description("Add authentication to your project")
    .option("--authType <authType>", "Type of auth provider to use", [
      "clerk",
      "next-auth",
    ])

    .action(async (opts: AddAuthOpts) => {
      const settings = opts.settings;
      if (settings.auth.type !== "none") {
        throw new Error("Auth already exists");
      }
      await runAddAuthAction(opts);
    });

  return addAuthCommand;
};
