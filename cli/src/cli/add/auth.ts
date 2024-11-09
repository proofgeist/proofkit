import * as p from "@clack/prompts";
import { Command } from "commander";
import { z } from "zod";

import { addAuth } from "~/generators/auth.js";
import { type Settings } from "~/utils/parseSettings.js";
import { abortIfCancel } from "../utils.js";

interface RunAddAuthOpts {
  settings: Settings;
  authOptions?: Parameters<typeof addAuth>[0]["options"];
}

export async function runAddAuthAction(opts?: RunAddAuthOpts) {
  const authType =
    opts?.authOptions?.type ??
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
            hint: "More advanced, but self-hosted and customizable",
          },
        ],
      })
    );

  const type = z.enum(["clerk", "proofkit"]).parse(authType);

  if (type === "proofkit") {
    const emailProviderAnswer =
      (opts?.authOptions?.type === "proofkit"
        ? opts?.authOptions?.emailProvider
        : undefined) ??
      abortIfCancel(
        await p.select({
          message: "What email provider do you want to use?",
          options: [
            { label: "Resend", value: "resend", hint: "Preferred" },
            {
              label: "Plunk",
              value: "plunk",
              hint: "Cheapest for <20k emails/mo",
            },
            { label: "Other / I'll do it myself later", value: "none" },
          ],
        })
      );

    const emailProvider = z
      .enum(["plunk", "resend", "none"])
      .parse(emailProviderAnswer);

    await addAuth({
      options: {
        type,
        emailProvider: emailProvider === "none" ? undefined : emailProvider,
      },
    });
  } else {
    await addAuth({ options: { type } });
  }
}

export const makeAddAuthCommand = () => {
  const addAuthCommand = new Command("auth")
    .description("Add authentication to your project")
    .option("--authType <authType>", "Type of auth provider to use")

    .action(
      async (opts: { settings: Settings; authType?: "clerk" | "proofkit" }) => {
        const settings = opts.settings;
        if (settings.auth.type !== "none") {
          throw new Error("Auth already exists");
        }
        await runAddAuthAction({
          ...opts,
          authOptions: opts.authType ? { type: opts.authType } : undefined,
        });
      }
    );

  return addAuthCommand;
};
