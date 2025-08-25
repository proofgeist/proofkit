import path from "path";
import * as p from "@clack/prompts";
import { Command } from "commander";
import { execa } from "execa";
import fs from "fs-extra";
import { type PackageJson } from "type-fest";

import { DEFAULT_APP_NAME } from "~/consts.js";
import { addAuth } from "~/generators/auth.js";
import { runCodegenCommand } from "~/generators/fmdapi.js";
import { ciOption, debugOption } from "~/globalOptions.js";
import { createBareProject } from "~/helpers/createProject.js";
import { initializeGit } from "~/helpers/git.js";
import { installDependencies } from "~/helpers/installDependencies.js";
import { logNextSteps } from "~/helpers/logNextSteps.js";
import { setImportAlias } from "~/helpers/setImportAlias.js";
import { getRegistryUrl, shadcnInstall } from "~/helpers/shadcn-cli.js";
import { buildPkgInstallerMap } from "~/installers/index.js";
import { ensureWebViewerAddonInstalled } from "~/installers/proofkit-webviewer.js";
import { initProgramState, state } from "~/state.js";
import { addPackageDependency } from "~/utils/addPackageDependency.js";
import { getVersion } from "~/utils/getProofKitVersion.js";
import { getUserPkgManager } from "~/utils/getUserPkgManager.js";
import { parseNameAndPath } from "~/utils/parseNameAndPath.js";
import {
  getSettings,
  setSettings,
  type Settings,
} from "~/utils/parseSettings.js";
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
  dataSource?: "filemaker" | "none" | "supabase";
  /** @internal UI library selection; hidden flag */
  ui?: "shadcn" | "mantine";
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
  dataSource: undefined,
  ui: "shadcn",
};

export const makeInitCommand = () => {
  const initCommand = new Command("init")
    .description("Create a new project with ProofKit")
    .argument(
      "[dir]",
      "The name of the application, as well as the name of the directory to create"
    )
    .option("--appType [type]", "The type of app to create", undefined)
    // hidden UI selector; default is shadcn; pass --ui mantine to opt-in legacy Mantine templates
    .option("--ui [ui]", undefined, undefined)
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
      "--dataSource [type]",
      "The data source to use for the web app (filemaker or none)",
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
    .addOption(ciOption)
    .addOption(debugOption)
    .action(runInit);

  initCommand.hook("preAction", (cmd) => {
    initProgramState(cmd.opts());
    state.baseCommand = "init";
  });

  return initCommand;
};

async function askForAuth({ projectDir }: { projectDir: string }) {
  const authType = "none" as "none" | "clerk" | "fmaddon";
  if (authType === "clerk") {
    await addAuth({
      options: { type: "clerk" },
      projectDir,
      noInstall: true,
    });
  } else if (authType === "fmaddon") {
    await addAuth({
      options: { type: "fmaddon" },
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
  // capture ui choice early into state
  state.ui = (cliOptions.ui ?? "shadcn") as "shadcn" | "mantine";

  const projectName =
    name ||
    abortIfCancel(
      await p.text({
        message: "What will your project be called?",
        defaultValue: DEFAULT_APP_NAME,
        validate: validateAppName,
      })
    ).toString();

  if (!state.appType) {
    state.appType = state.ci
      ? "browser"
      : (abortIfCancel(
          await p.select({
            message: "What kind of app do you want to build?",
            options: [
              {
                value: "browser",
                label: "Web App for Browsers",
                hint: "Uses Next.js, will require hosting",
              },
              {
                value: "webviewer",
                label: "FileMaker Web Viewer (beta)",
                hint: "Uses Vite, can be embedded in FileMaker or hosted",
              },
            ],
          })
        ) as "browser" | "webviewer");
  }

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
  setImportAlias(projectDir, "@/");

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

  // Ensure proofkit.json exists with initial settings including ui
  const initialSettings: Settings = {
    appType: state.appType ?? "browser",
    ui: (state.ui as "shadcn" | "mantine") ?? "shadcn",
    auth: { type: "none" },
    envFile: ".env",
    dataSources: [],
    tanstackQuery: false,
    replacedMainPage: false,
    appliedUpgrades: ["cursorRules"],
  };
  const { registryUrl } = setSettings(initialSettings);

  // for webviewer apps FM is required, so don't ask
  let dataSource =
    state.appType === "webviewer" ? "filemaker" : cliOptions.dataSource;
  if (!dataSource) {
    dataSource = abortIfCancel(
      await p.select({
        message: "Do you want to connect to a FileMaker Database now?",
        options: [
          {
            value: "filemaker",
            label: "Yes",
            hint: "Requires OttoFMS and Admin Server credentials",
          },
          // { value: "supabase", label: "Supabase" },
          {
            value: "none",
            label: "No",
            hint: "You'll be able to add a new data source later",
          },
        ],
      })
    ) as "filemaker" | "none" | "supabase";
  }

  if (dataSource === "filemaker") {
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

    // Now that we have the data source set up, check for webviewer layouts if needed
    if (state.appType === "webviewer") {
      await ensureWebViewerAddonInstalled();
    }
  } else if (dataSource === "supabase") {
    // TODO: add supabase
  }

  await askForAuth({ projectDir });

  await installDependencies({ projectDir });

  if (state.ui === "shadcn") {
    await shadcnInstall([
      `${getRegistryUrl()}/r/mode-toggle`,
      "sonner",
      "button",
    ]);
  }

  await runCodegenCommand();

  if (!cliOptions.noGit) {
    await initializeGit(projectDir);
  }

  logNextSteps({
    projectName: appDir,
    noInstall: cliOptions.noInstall,
  });
};
