import path from "path";

import { installPackages } from "~/helpers/installPackages.js";
import { scaffoldProject } from "~/helpers/scaffoldProject.js";
import { type AvailableDependencies } from "~/installers/dependencyVersionMap.js";
import { type PkgInstallerMap } from "~/installers/index.js";
import { state } from "~/state.js";
import { addPackageDependency } from "~/utils/addPackageDependency.js";
import { getUserPkgManager } from "~/utils/getUserPkgManager.js";
import { replaceTextInFiles } from "./replaceText.js";
import { shadcnInstall } from "./shadcn-cli.js";

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

  addPackageDependency({
    dependencies: ["@proofkit/cli", "@types/node"],
    devMode: true,
  });

  // Add new base dependencies for Tailwind v4 and shadcn/ui or legacy Mantine
  // These should match the plan and dependencyVersionMap
  const SHADCN_BASE_DEPS = [
    "@radix-ui/react-slot",
    "@tailwindcss/postcss",
    "class-variance-authority",
    "clsx",
    "lucide-react",
    "tailwind-merge",
    "tailwindcss",
    "tw-animate-css",
    "next-themes",
  ] as AvailableDependencies[];
  const SHADCN_BASE_DEV_DEPS = [
    "prettier",
    "prettier-plugin-tailwindcss",
  ] as AvailableDependencies[];

  const MANTINE_DEPS = [
    "@mantine/core",
    "@mantine/dates",
    "@mantine/hooks",
    "@mantine/modals",
    "@mantine/notifications",
    "mantine-react-table",
  ] as AvailableDependencies[];
  const MANTINE_DEV_DEPS = [
    "postcss",
    "postcss-preset-mantine",
    "postcss-simple-vars",
  ] as AvailableDependencies[];

  if (state.ui === "mantine") {
    addPackageDependency({
      dependencies: MANTINE_DEPS,
      devMode: false,
    });
    addPackageDependency({
      dependencies: MANTINE_DEV_DEPS,
      devMode: true,
    });
  } else if (state.ui === "shadcn") {
    addPackageDependency({
      dependencies: SHADCN_BASE_DEPS,
      devMode: false,
    });
    addPackageDependency({
      dependencies: SHADCN_BASE_DEV_DEPS,
      devMode: true,
    });
  } else {
    throw new Error(`Unsupported UI library: ${state.ui}`);
  }

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
