import path from "path";

import { installPackages } from "~/helpers/installPackages.js";
import { scaffoldProject } from "~/helpers/scaffoldProject.js";
import { type AvailableDependencies } from "~/installers/dependencyVersionMap.js";
import { type PkgInstallerMap } from "~/installers/index.js";
import { state } from "~/state.js";
import { addPackageDependency } from "~/utils/addPackageDependency.js";
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
  state.projectDir = path.resolve(process.cwd(), projectName);

  // Bootstraps the base Next.js application
  await scaffoldProject({
    projectName,
    pkgManager,
    scopedAppName,
    noInstall,
  });

  // Add new base dependencies for Tailwind v4 and shadcn/ui
  // These should match the plan and dependencyVersionMap
  const BASE_DEPS = [
    "@radix-ui/react-slot",
    "@tailwindcss/postcss",
    "class-variance-authority",
    "clsx",
    "lucide-react",
    "tailwind-merge",
    "tailwindcss",
    "tw-animate-css",
  ] as AvailableDependencies[];
  const BASE_DEV_DEPS = [
    "prettier",
    "prettier-plugin-tailwindcss",
  ] as AvailableDependencies[];

  addPackageDependency({
    dependencies: BASE_DEPS,
    devMode: false,
    projectDir: state.projectDir,
  });
  addPackageDependency({
    dependencies: BASE_DEV_DEPS,
    devMode: true,
    projectDir: state.projectDir,
  });

  // Install the selected packages
  installPackages({
    projectName,
    scopedAppName,
    pkgManager,
    packages,
    noInstall,
  });

  replaceTextInFiles(
    state.projectDir,
    "__PNPM_COMMAND__",
    pkgManager === "pnpm"
      ? "pnpm"
      : pkgManager === "bun"
        ? "bun"
        : pkgManager === "yarn"
          ? "yarn"
          : "npm run"
  );

  return state.projectDir;
};
