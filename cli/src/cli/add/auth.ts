import * as p from "@clack/prompts";
import chalk from "chalk";
import { Command } from "commander";
import { z } from "zod";

import { addAuth } from "~/generators/auth.js";
import { ciOption, debugOption } from "~/globalOptions.js";
import { initProgramState, state } from "~/state.js";
import { getSettings } from "~/utils/parseSettings.js";
import { abortIfCancel } from "../utils.js";

export async function runAddAuthAction() {
  const authType =
    state.authType ??
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
  state.authType = type;

  if (type === "proofkit") {
    const emailProviderAnswer =
      (state.emailProvider
        ? state.emailProvider
        : state.ci
          ? "none"
          : undefined) ??
      abortIfCancel(
        await p.select({
          message: `What email provider do you want to use?\n${chalk.dim(
            "Used to send email verification codes. If you skip this, the codes will be displayed in your terminal."
          )}`,
          options: [
            {
              label: "Resend",
              value: "resend",
              hint: "Great dev experience",
            },
            {
              label: "Plunk",
              value: "plunk",
              hint: "Cheapest for <20k emails/mo, self-hostable",
            },
            { label: "Other / I'll do it myself later", value: "none" },
          ],
        })
      );

    const emailProvider = z
      .enum(["plunk", "resend", "none"])
      .parse(emailProviderAnswer);

    state.emailProvider = emailProvider;

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
    .option(
      "--emailProvider <emailProvider>",
      "Email provider to use (only for ProofKit Auth)"
    )
    .option(
      "--apiKey <apiKey>",
      "API key to use for the email provider (only for ProofKit Auth)"
    )
    .addOption(ciOption)
    .addOption(debugOption)

    .action(async () => {
      const settings = getSettings();
      if (settings.auth.type !== "none") {
        throw new Error("Auth already exists");
      }
      await runAddAuthAction();
    });

  addAuthCommand.hook("preAction", (thisCommand) => {
    initProgramState(thisCommand.opts());
  });

  return addAuthCommand;
};
