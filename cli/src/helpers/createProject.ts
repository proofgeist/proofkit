import path from "path";

import { installPackages } from "~/helpers/installPackages.js";
import { scaffoldProject } from "~/helpers/scaffoldProject.js";
import { type PkgInstallerMap } from "~/installers/index.js";
import { getUserPkgManager } from "~/utils/getUserPkgManager.js";
import { replaceTextInFiles } from "./replaceText.js";

interface CreateProjectOptions {
  projectName: string;
  packages: PkgInstallerMap;
  scopedAppName: string;
  noInstall: boolean;
  appRouter: boolean;
}

export const createBareProject = async ({
  projectName,
  scopedAppName,
  packages,
  noInstall,
}: CreateProjectOptions) => {
  const pkgManager = getUserPkgManager();
  const projectDir = path.resolve(process.cwd(), projectName);

  // Bootstraps the base Next.js application
  await scaffoldProject({
    projectName,
    projectDir,
    pkgManager,
    scopedAppName,
    noInstall,
  });

  // Install the selected packages
  installPackages({
    projectName,
    scopedAppName,
    projectDir,
    pkgManager,
    packages,
    noInstall,
  });

  replaceTextInFiles(
    projectDir,
    "__PNPM_COMMAND__",
    pkgManager === "pnpm"
      ? "pnpm"
      : pkgManager === "bun"
        ? "bun"
        : pkgManager === "yarn"
          ? "yarn"
          : "npm run"
  );

  return projectDir;
};
