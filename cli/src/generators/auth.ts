import { installDependencies } from "~/helpers/installDependencies.js";
import { clerkInstaller } from "~/installers/clerk.js";
import { proofkitAuthInstaller } from "~/installers/proofkit-auth.js";
import {
  parseSettings,
  setSettings,
  type Settings,
} from "~/utils/parseSettings.js";

export async function addAuth({
  type,
  noInstall = false,
  projectDir = process.cwd(),
}: {
  type: "clerk" | "proofkit";
  projectDir?: string;
  noInstall?: boolean;
}) {
  const settings = parseSettings(projectDir);
  if (settings.auth.type !== "none") {
    throw new Error("Auth already exists");
  }

  if (type === "clerk") {
    await addClerkAuth({ settings, projectDir });
  } else if (type === "proofkit") {
    await addProofkitAuth({ settings, projectDir });
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
}: {
  settings: Settings;
  projectDir?: string;
}) {
  await proofkitAuthInstaller({ projectDir });
  setSettings({ ...settings, auth: { type: "proofkit" } }, projectDir);
}
