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
  } else if (
    !settings.dataSources.some((o) => o.type === "fm") &&
    options.type === "fmaddon"
  ) {
    throw new Error(
      "A FileMaker data source is required to use the FM Add-on Auth"
    );
  }

  if (options.type === "clerk") {
    await addClerkAuth({ projectDir });
  } else if (options.type === "fmaddon") {
    await addFmaddonAuth();
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

async function addFmaddonAuth() {
  await proofkitAuthInstaller();
  mergeSettings({ auth: { type: "fmaddon" } });
}
