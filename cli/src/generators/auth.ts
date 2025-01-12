import { installDependencies } from "~/helpers/installDependencies.js";
import { clerkInstaller } from "~/installers/clerk.js";
import { proofkitAuthInstaller } from "~/installers/proofkit-auth.js";
import { getSettings, mergeSettings } from "~/utils/parseSettings.js";

export async function addAuth({
  options,
  noInstall = false,
  projectDir = process.cwd(),
}: {
  options:
    | { type: "clerk" }
    | {
        type: "fmaddon";
        emailProvider?: "plunk" | "resend";
        apiKey?: string;
      };
  projectDir?: string;
  noInstall?: boolean;
}) {
  const settings = getSettings();
  if (settings.auth.type !== "none") {
    throw new Error("Auth already exists");
  }

  if (options.type === "clerk") {
    await addClerkAuth({ projectDir });
  } else if (options.type === "fmaddon") {
    await addFmaddonAuth(options);
  }

  if (!noInstall) {
    await installDependencies({ projectDir });
  }
}

async function addClerkAuth({
  projectDir = process.cwd(),
}: {
  projectDir?: string;
}) {
  await clerkInstaller({ projectDir });
  mergeSettings({ auth: { type: "clerk" } });
}

async function addFmaddonAuth({
  emailProvider,
}: {
  emailProvider?: "plunk" | "resend";
}) {
  await proofkitAuthInstaller();
  mergeSettings({ auth: { type: "fmaddon" } });
}
