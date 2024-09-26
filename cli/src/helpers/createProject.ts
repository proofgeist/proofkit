import path from "path";

import { addAuth } from "~/generators/auth.js";
import { installPackages } from "~/helpers/installPackages.js";
import { scaffoldProject } from "~/helpers/scaffoldProject.js";
import {
  selectLayoutFile,
  selectPageFile,
} from "~/helpers/selectBoilerplate.js";
import { type FMAuthKeys } from "~/installers/envVars.js";
import { type PkgInstallerMap } from "~/installers/index.js";
import { getUserPkgManager } from "~/utils/getUserPkgManager.js";

interface CreateProjectOptions {
  projectName: string;
  packages: PkgInstallerMap;
  scopedAppName: string;
  keys: FMAuthKeys;
  noInstall: boolean;
  importAlias: string;
  appRouter: boolean;
  fileName: string;
  dataApiKey: string;
  fmServerURL: string;
  authType: "clerk" | "next-auth" | "none";
}

export const createProject = async ({
  projectName,
  scopedAppName,
  packages,
  keys,
  noInstall,
  fileName,
  dataApiKey,
  fmServerURL,
  authType,
}: CreateProjectOptions) => {
  const pkgManager = getUserPkgManager();
  const projectDir = path.resolve(process.cwd(), projectName);

  // Bootstraps the base Next.js application
  await scaffoldProject({
    projectName,
    projectDir,
    pkgManager,
    scopedAppName,
    keys,
    noInstall,
    fileName,
    fmServerURL,
    dataApiKey,
  });

  // Install the selected packages
  installPackages({
    projectName,
    scopedAppName,
    projectDir,
    pkgManager,
    keys,
    packages,
    noInstall,
    fileName,
    dataApiKey,
    fmServerURL,
  });

  if (authType === "next-auth") {
    await addAuth({
      type: "next-auth",
      projectDir,
      noInstall,
    });
  } else if (authType === "clerk") {
    await addAuth({
      type: "clerk",
      projectDir,
      noInstall,
    });
  }

  return projectDir;
};
