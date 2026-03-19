import { Command } from "commander";
import { select } from "~/cli/prompts.js";
import { debugOption, nonInteractiveOption } from "~/globalOptions.js";
import { installFmAddonExplicitly } from "~/installers/install-fm-addon.js";
import { initProgramState, isNonInteractiveMode } from "~/state.js";
import { getSettings } from "~/utils/parseSettings.js";
import { abortIfCancel, ensureProofKitProject } from "../utils.js";

type AddonTarget = "webviewer" | "auth";

async function resolveAddonTarget(name?: string): Promise<AddonTarget> {
  if (name === "webviewer" || name === "auth") {
    return name;
  }

  if (isNonInteractiveMode()) {
    throw new Error("Addon target is required in non-interactive mode. Use `proofkit add addon webviewer`.");
  }

  return abortIfCancel(
    await select({
      message: "Which add-on do you want to install locally?",
      options: [
        { value: "webviewer", label: "WebViewer", hint: "ProofKit WebViewer add-on" },
        { value: "auth", label: "Auth", hint: "ProofKit Auth add-on" },
      ],
    }),
  ) as AddonTarget;
}

export async function runAddAddonAction(targetName?: string) {
  ensureProofKitProject({ commandName: "add addon" });
  const settings = getSettings();
  const target = await resolveAddonTarget(targetName);

  if (target === "webviewer" && settings.appType !== "webviewer") {
    throw new Error("The WebViewer add-on can only be added from a WebViewer ProofKit project.");
  }

  if (target === "auth" && settings.appType !== "browser") {
    throw new Error("The auth add-on can only be added from a browser ProofKit project.");
  }

  await installFmAddonExplicitly({ addonName: target === "webviewer" ? "wv" : "auth" });
}

export const makeAddAddonCommand = () => {
  const addAddonCommand = new Command("addon")
    .description("Install or update local FileMaker add-on files")
    .argument("[target]", "Add-on to install locally (webviewer or auth)")
    .addOption(nonInteractiveOption)
    .addOption(debugOption)
    .action(async (target) => {
      await runAddAddonAction(target);
    });

  addAddonCommand.hook("preAction", (thisCommand) => {
    initProgramState(thisCommand.opts());
  });

  return addAddonCommand;
};
