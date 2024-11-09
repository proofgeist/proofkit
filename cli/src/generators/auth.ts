import { installDependencies } from "~/helpers/installDependencies.js";
import { clerkInstaller } from "~/installers/clerk.js";
import { proofkitAuthInstaller } from "~/installers/proofkit-auth.js";
import {
  parseSettings,
  setSettings,
  type Settings,
} from "~/utils/parseSettings.js";

export async function addAuth({
  options,
  noInstall = false,
  projectDir = process.cwd(),
}: {
  options:
    | { type: "clerk" }
    | { type: "proofkit"; emailProvider?: "plunk" | "resend" };
  projectDir?: string;
  noInstall?: boolean;
}) {
  const settings = parseSettings(projectDir);
  if (settings.auth.type !== "none") {
    throw new Error("Auth already exists");
  }

  if (options.type === "clerk") {
    await addClerkAuth({ settings, projectDir });
  } else if (options.type === "proofkit") {
    await addProofkitAuth({
      settings,
      projectDir,
      emailProvider: options.emailProvider,
    });
  }

  if (!noInstall) {
    await installDependencies({ projectDir });
  }
}

async function addClerkAuth({
  settings,
  projectDir = process.cwd(),
}: {
  settings: Settings;
  projectDir?: string;
}) {
  await clerkInstaller({ projectDir });
  setSettings({ ...settings, auth: { type: "clerk" } }, projectDir);
}

async function addProofkitAuth({
  settings,
  projectDir = process.cwd(),
  emailProvider,
}: {
  settings: Settings;
  projectDir?: string;
  emailProvider?: "plunk" | "resend";
}) {
  await proofkitAuthInstaller({ projectDir, emailProvider });
  setSettings({ ...settings, auth: { type: "proofkit" } }, projectDir);
}
