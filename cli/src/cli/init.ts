import path from "path";
import * as p from "@clack/prompts";
import { type OttoAPIKey } from "@proofgeist/fmdapi";
// import { isOttoFMSAPIKey } from "@proofgeist/fmdapi/dist/adapters/otto.js";
import chalk from "chalk";
import { Command } from "commander";
import { execa } from "execa";
import fs from "fs-extra";
import { SemVer } from "semver";
import { type PackageJson } from "type-fest";

import { CREATE_FM_APP, DEFAULT_APP_NAME } from "~/consts.js";
import {
  addLayout,
  initFmdapi,
  runCodegenCommand,
} from "~/generators/fmdpai.js";
import { createProject } from "~/helpers/createProject.js";
import { initializeGit } from "~/helpers/git.js";
import { installDependencies } from "~/helpers/installDependencies.js";
import { logNextSteps } from "~/helpers/logNextSteps.js";
import { setImportAlias } from "~/helpers/setImportAlias.js";
import { fetchServerVersions } from "~/helpers/version-fetcher.js";
import { type FMAuthKeys } from "~/installers/envVars.js";
import { buildPkgInstallerMap } from "~/installers/index.js";
import { addPackageDependency } from "~/utils/addPackageDependency.js";
import { getVersion } from "~/utils/getProofKitVersion.js";
import { getUserPkgManager } from "~/utils/getUserPkgManager.js";
import { IsTTYError } from "~/utils/isTTYError.js";
import { logger } from "~/utils/logger.js";
import { parseNameAndPath } from "~/utils/parseNameAndPath.js";
import { validateAppName } from "~/utils/validateAppName.js";
import { getLayouts } from "./fmdapi.js";
import {
  createDataAPIKey,
  getOttoFMSToken,
  listAPIKeys,
  listFiles,
} from "./ottofms.js";

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

interface CliResults {
  appName: string;
  authType: "none" | "next-auth" | "clerk";
  flags: CliFlags;
  keys: FMAuthKeys;
}

const defaultOptions: CliResults = {
  appName: DEFAULT_APP_NAME,
  authType: "none",
  keys: { ottoApiKey: "" },
  flags: {
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
  },
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

    /** START CI-FLAGS */
    /**
     * @experimental Used for CI E2E tests. If any of the following option-flags are provided, we
     *               skip prompting.
     */
    .option("--CI", "Boolean value if we're running in CI", false)
    /** @experimental - Used for CI E2E tests. Used in conjunction with `--CI` to skip prompting. */
    /** @experimental Used for CI E2E tests. Used in conjunction with `--CI` to skip prompting. */

    /** @experimental - Used for CI E2E tests. Used in conjunction with `--CI` to skip prompting. */
    .option(
      "--trpc [boolean]",
      "Experimental: Boolean value if we should install tRPC. Must be used in conjunction with `--CI`.",
      (value) => !!value && value !== "false"
    )

    /** END CI-FLAGS */
    .version(getVersion(), "-v, --version", "Display the version number")
    .addHelpText(
      "afterAll",
      `\n The t3 stack was inspired by ${chalk
        .hex("#E8DCFF")
        .bold(
          "@t3dotgg"
        )} and has been used to build awesome fullstack applications like ${chalk
        .hex("#E24A8D")
        .underline("https://ping.gg")} \n`
    )
    .action(runInit);

  return initCommand;
};

const initProject = async ({
  appName,
  opts,
}: {
  appName?: string;
  opts?: CliFlags;
}): Promise<CliResults> => {
  const cliResults = defaultOptions;

  // Needs to be separated outside the if statement to correctly infer the type as string | undefined
  const cliProvidedName = appName;
  if (cliProvidedName) {
    cliResults.appName = cliProvidedName;
  }

  cliResults.flags = { ...cliResults.flags, ...opts };

  // Explained below why this is in a try/catch block
  try {
    if (process.env.TERM_PROGRAM?.toLowerCase().includes("mintty")) {
      logger.warn(`  WARNING: It looks like you are using MinTTY, which is non-interactive. This is most likely because you are
  using Git Bash. If that's that case, please use Git Bash from another terminal, such as Windows Terminal. Alternatively, you
  can provide the arguments from the CLI directly: https://create.t3.gg/en/installation#experimental-usage to skip the prompts.`);

      throw new IsTTYError("Non-interactive environment");
    }

    const projectName =
      cliProvidedName ||
      (await p.text({
        message: "What will your project be called?",
        defaultValue: cliResults.appName,
        validate: validateAppName,
      }));

    const server = await getValidFileMakerServerUrl(cliResults.flags.server);

    const canDoBrowserLogin =
      server.ottoVersion && server.ottoVersion.compare(new SemVer("4.7.0")) > 0;

    if (!canDoBrowserLogin && !cliResults.flags.adminApiKey) {
      p.log.error(
        "OttoFMS 4.7.0 or later is required to auto-login with this CLI. Please install/upgrade OttoFMS on your server, or pass an Admin API key with the --adminApiKey flag then try again"
      );
    }

    const token =
      cliResults.flags.adminApiKey ||
      (await getOttoFMSToken({ url: server.url })).token;

    const fileList = await listFiles({ url: server.url, token });
    const selectedFile =
      cliResults.flags.fileName ||
      (await p.select({
        message: `Which file would you like to connect to? ${chalk.dim(`(TIP: Select the file where your data is stored)`)}`,
        maxItems: 10,
        options: fileList.map((file) => ({
          value: file.filename,
          label: file.filename,
        })),
      }));
    if (typeof selectedFile !== "string") throw new Error("Invalid file");
    const fmFile = selectedFile;

    const allApiKeys = await listAPIKeys({ url: server.url, token });
    const thisFileApiKeys = allApiKeys.filter((key) => key.database === fmFile);

    let dataApiKey = cliResults.flags.dataApiKey;
    if (!dataApiKey && thisFileApiKeys.length > 0) {
      const selectedKey = await p.select({
        message: "Which API key would you like to use?",
        options: [
          ...thisFileApiKeys.map((key) => ({
            value: key.key,
            label: `${chalk.bold(key.label)} - ${key.user}`,
            hint: key.key,
          })),
          {
            value: "create",
            label: "Create a new API key",
            hint: "Requires FileMaker credentials for this file",
          },
        ],
      });
      if (typeof selectedKey !== "string") throw new Error("Invalid key");
      if (selectedKey !== "create") dataApiKey = selectedKey;
    }

    if (!dataApiKey) {
      // data api was not provided, prompt to create a new one
      const resp = await createDataAPIKey({
        filename: fmFile,
        url: server.url,
      });
      dataApiKey = resp.apiKey;
    }

    if (!dataApiKey) throw new Error("No API key");
    // if (!isOttoFMSAPIKey(dataApiKey)) throw new Error("Invalid API key");

    let layout = cliResults.flags.layoutName;
    await p.group(
      {
        layoutName: async () => {
          if (layout) return;

          const layouts = await getLayouts({
            dataApiKey: dataApiKey as OttoAPIKey,
            fmFile,
            server: server.url.origin,
          });

          const selectedLayout = await p.select({
            message: `Which layout contains the data you want to display on the web app? ${chalk.dim(`(You can add more layouts later)`)}`,
            maxItems: 10,
            options: layouts.map((layout) => ({
              value: layout,
              label: layout,
            })),
          });

          if (typeof selectedLayout === "string") layout = selectedLayout;

          return;
        },
      },
      {
        onCancel: () => {
          p.log.warn(
            "Skipping layout selection... You can add layouts to this app later"
          );
        },
      }
    );

    const schemaName =
      cliResults.flags.schemaName ||
      (
        await p.text({
          message: "What would you like to call the generated layout client?",
          defaultValue: layout,
        })
      ).toString();

    const auth =
      opts?.auth ??
      (
        await p.select({
          message:
            "What authentication provider would you like to use for users of your web app?",
          options: [
            {
              value: "clerk",
              label: "Clerk",
              hint: "Easier setup, but may require additional subscription",
            },
            {
              value: "next-auth",
              label: "NextAuth.js",
              hint: "Will use the FileMaker Adapter for managing user sessions. No password-based login",
            },
            {
              value: "none",
              label: "None",
              hint: "Use only if you don't need users to login to this app",
            },
          ],
          initialValue: "clerk",
        })
      ).toString();

    return {
      appName: projectName.toString() ?? cliResults.appName,
      authType:
        auth === "clerk"
          ? "clerk"
          : auth === "next-auth"
            ? "next-auth"
            : "none",

      keys: { ottoApiKey: dataApiKey },
      flags: {
        ...cliResults.flags,
        fileName: fmFile,
        layoutName: layout,
        schemaName,
        dataApiKey,
        fmServerURL: server.url.origin,
        // noGit: !project.git || cliResults.flags.noGit,
        noInstall: cliResults.flags.noInstall,
      },
    };
  } catch (err) {
    // If the user is not calling proofkit from an interactive terminal, inquirer will throw an IsTTYError
    // If this happens, we catch the error, tell the user what has happened, and then continue to run the program with a default t3 app
    if (err instanceof IsTTYError) {
      logger.warn(`
  ${CREATE_FM_APP} needs an interactive terminal to provide options`);

      const shouldContinue = await p.confirm({
        message: `Continue scaffolding a default fm app?`,
        initialValue: true,
      });

      if (!shouldContinue) {
        logger.info("Exiting...");
        process.exit(0);
      }

      logger.info(`Bootstrapping a default fm app in ./${cliResults.appName}`);
    } else {
      throw err;
    }
  }

  return cliResults;
};

async function getValidFileMakerServerUrl(
  defaultServerUrl?: string | undefined
): Promise<{
  url: URL;
  fmsVersion: SemVer;
  ottoVersion: SemVer | null;
}> {
  let url: URL | null = null;
  let fmsVersion: SemVer | null = null;
  let ottoVersion: SemVer | null = null;

  while (fmsVersion === null) {
    const serverUrl =
      defaultServerUrl ??
      (await p.text({
        message: "What is the URL of your FileMaker Server?",
        validate: (value) => {
          try {
            if (!value.startsWith("http"))
              return "URL must start with https://";
            const url = new URL(value);
            p.log.info(url.protocol);
            return;
          } catch {
            return "Please enter a valid URL";
          }
        },
      }));
    if (typeof serverUrl !== "string") throw new Error("Invalid URL");

    url = new URL(serverUrl);

    // check for FileMaker and Otto versions
    const { fmsInfo, ottoInfo } = await fetchServerVersions({
      url: url.origin,
    });
    fmsVersion = new SemVer(fmsInfo.ServerVersion.split(" ")[0]!) ?? null;
    ottoVersion = new SemVer(ottoInfo?.Otto.version ?? "") ?? null;
    defaultServerUrl = undefined;
  }

  if (url === null) throw new Error("Unable to get FileMaker Server URL");

  p.note(`🎉 FileMaker Server version ${fmsVersion} detected \n
    ${!!ottoVersion ? `🎉 OttoFMS version ${ottoVersion} detected` : "❌ OttoFMS not detected"}`);

  if (ottoVersion === null) {
    p.log.warn(
      "OttoFMS is strongly reccommended for the best experience integrating with web apps"
    );
  }

  return { url, ottoVersion, fmsVersion };
}

type ProofKitPackageJSON = PackageJson & {
  proofkitMetadata?: {
    initVersion: string;
  };
};

export const runInit = async (name?: string, opts?: CliFlags) => {
  const pkgManager = getUserPkgManager();

  const {
    appName,
    keys,
    authType,
    flags: {
      noGit,
      noInstall,
      importAlias,
      appRouter,
      fileName,
      layoutName,
      dataApiKey,
      fmServerURL,
      schemaName,
    },
  } = await initProject({ opts, appName: name });

  const usePackages = buildPkgInstallerMap();

  // e.g. dir/@mono/app returns ["@mono/app", "dir/app"]
  const [scopedAppName, appDir] = parseNameAndPath(appName);

  const projectDir = await createProject({
    projectName: appDir,
    scopedAppName,
    packages: usePackages,
    fmServerURL,
    keys,
    importAlias,
    noInstall,
    appRouter,
    fileName,
    dataApiKey,
    authType,
  });

  initFmdapi({ projectDir });
  await addLayout({
    projectDir,
    schemas: [{ layout: layoutName, schemaName: schemaName }],
    runCodegen: false,
  });

  // Write name to package.json
  const pkgJson = fs.readJSONSync(
    path.join(projectDir, "package.json")
  ) as ProofKitPackageJSON;
  pkgJson.name = scopedAppName;
  pkgJson.proofkitMetadata = { initVersion: getVersion() };

  addPackageDependency({
    dependencies: ["@proofgeist/kit"],
    devMode: true,
    projectDir,
  });

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

  if (!noInstall) {
    await installDependencies({ projectDir });
    await runCodegenCommand({ projectDir });
  }

  if (!noGit) {
    await initializeGit(projectDir);
  }

  await logNextSteps({
    projectName: appDir,
    noInstall,
    projectDir,
  });
};
