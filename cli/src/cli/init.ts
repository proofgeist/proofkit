import path from "path";
import * as p from "@clack/prompts";
import { Command } from "commander";
import { execa } from "execa";
import fs from "fs-extra";
import { type PackageJson } from "type-fest";

import { DEFAULT_APP_NAME } from "~/consts.js";
import { addAuth } from "~/generators/auth.js";
import { runCodegenCommand } from "~/generators/fmdapi.js";
import { createBareProject } from "~/helpers/createProject.js";
import { initializeGit } from "~/helpers/git.js";
import { installDependencies } from "~/helpers/installDependencies.js";
import { logNextSteps } from "~/helpers/logNextSteps.js";
import { setImportAlias } from "~/helpers/setImportAlias.js";
import { buildPkgInstallerMap } from "~/installers/index.js";
import { addPackageDependency } from "~/utils/addPackageDependency.js";
import { getVersion } from "~/utils/getProofKitVersion.js";
import { getUserPkgManager } from "~/utils/getUserPkgManager.js";
import { parseNameAndPath } from "~/utils/parseNameAndPath.js";
import { validateAppName } from "~/utils/validateAppName.js";
import { promptForFileMakerDataSource } from "./add/data-source/filemaker.js";
import { abortIfCancel } from "./utils.js";

interface CliFlags {
  noGit: boolean;
  noInstall: boolean;
  default: boolean;
  importAlias: string;
  server?: string;
  adminApiKey?: string;
  fileName: string;
  layoutName: string;
  schemaName: string;
  dataApiKey: string;
  fmServerURL: string;
  auth: "none" | "next-auth" | "clerk";
  /** @internal Used in CI. */
  CI: boolean;
  /** @internal Used in CI. */
  tailwind: boolean;
  /** @internal Used in CI. */
  trpc: boolean;
  /** @internal Used in CI. */
  prisma: boolean;
  /** @internal Used in CI. */
  drizzle: boolean;
  /** @internal Used in CI. */
  appRouter: boolean;
}

const defaultOptions: CliFlags = {
  noGit: false,
  noInstall: false,
  default: false,
  CI: false,
  tailwind: false,
  trpc: false,
  prisma: false,
  drizzle: false,
  importAlias: "~/",
  appRouter: false,
  auth: "none",
  server: undefined,
  fileName: "",
  layoutName: "",
  schemaName: "",
  dataApiKey: "",
  fmServerURL: "",
};

export const makeInitCommand = () => {
  const initCommand = new Command("init")
    .description("Create a new project with ProofKit")
    .argument(
      "[dir]",
      "The name of the application, as well as the name of the directory to create"
    )
    .option("--server [url]", "The URL of your FileMaker Server", undefined)
    .option(
      "--adminApiKey [key]",
      "Admin API key for OttoFMS. If provided, will skip login prompt",
      undefined
    )
    .option(
      "--fileName [name]",
      "The name of the FileMaker file to use for the web app",
      undefined
    )
    .option(
      "--layoutName [name]",
      "The name of the FileMaker layout to use for the web app",
      undefined
    )
    .option(
      "--schemaName [name]",
      "The name for the generated layout client in your schemas",
      undefined
    )
    .option(
      "--dataApiKey [key]",
      "The API key to use for the FileMaker Data API",
      undefined
    )
    .option(
      "--auth [type]",
      "The authentication provider to use for the web app",
      undefined
    )
    .option(
      "--noGit",
      "Explicitly tell the CLI to not initialize a new git repo in the project",
      false
    )
    .option(
      "--noInstall",
      "Explicitly tell the CLI to not run the package manager's install command",
      false
    )
    .action(runInit);

  return initCommand;
};

async function askForAuth({ projectDir }: { projectDir: string }) {
  const authType = "none" as string;
  if (authType === "proofkit") {
    await addAuth({
      options: { type: "proofkit" },
      projectDir,
      noInstall: true,
    });
  } else if (authType === "clerk") {
    await addAuth({
      options: { type: "clerk" },
      projectDir,
      noInstall: true,
    });
  }
}

type ProofKitPackageJSON = PackageJson & {
  proofkitMetadata?: {
    initVersion: string;
  };
};

export const runInit = async (name?: string, opts?: CliFlags) => {
  const pkgManager = getUserPkgManager();
  const cliOptions = opts ?? defaultOptions;

  // Needs to be separated outside the if statement to correctly infer the type as string | undefined

  const projectName =
    name ||
    abortIfCancel(
      await p.text({
        message: "What will your project be called?",
        defaultValue: DEFAULT_APP_NAME,
        validate: validateAppName,
      })
    ).toString();

  const usePackages = buildPkgInstallerMap();

  // e.g. dir/@mono/app returns ["@mono/app", "dir/app"]
  const [scopedAppName, appDir] = parseNameAndPath(projectName);

  const projectDir = await createBareProject({
    projectName: appDir,
    scopedAppName,
    packages: usePackages,
    noInstall: cliOptions.noInstall,
    appRouter: cliOptions.appRouter,
  });

  // later will split this flow to ask for which kind of data souce, but for now it's just FM
  await promptForFileMakerDataSource({
    projectDir,
    name: "filemaker",
    adminApiKey: cliOptions.adminApiKey,
    dataApiKey: cliOptions.dataApiKey,
    server: cliOptions.server,
    fileName: cliOptions.fileName,
    layoutName: cliOptions.layoutName,
    schemaName: cliOptions.schemaName,
  });

  await askForAuth({ projectDir });

  addPackageDependency({
    dependencies: ["@proofgeist/kit"],
    devMode: true,
    projectDir,
  });

  // Write name to package.json
  const pkgJson = fs.readJSONSync(
    path.join(projectDir, "package.json")
  ) as ProofKitPackageJSON;
  pkgJson.name = scopedAppName;
  pkgJson.proofkitMetadata = { initVersion: getVersion() };

  // ? Bun doesn't support this field (yet)
  if (pkgManager !== "bun") {
    const { stdout } = await execa(pkgManager, ["-v"], {
      cwd: projectDir,
    });
    pkgJson.packageManager = `${pkgManager}@${stdout.trim()}`;
  }

  fs.writeJSONSync(path.join(projectDir, "package.json"), pkgJson, {
    spaces: 2,
  });

  setImportAlias(projectDir, "@/");

  if (!cliOptions.noInstall) {
    await installDependencies({ projectDir });
    await runCodegenCommand({ projectDir });
  }

  if (!cliOptions.noGit) {
    await initializeGit(projectDir);
  }

  await logNextSteps({
    projectName: appDir,
    noInstall: cliOptions.noInstall,
  });
};
